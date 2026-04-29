import { BadRequestException, Injectable, Logger, ForbiddenException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { QuerySystemLogsDto } from "../dto/query-system-logs.dto";
import { FrontendErrorReportDto } from "../dto/frontend-error-report.dto";
import { CurrentUserPayload } from "../../../common/current-user.decorator";
import { ScopeService } from "../../../common/services/scope.service";
import { AuditLogService } from "../../../common/services/audit-log.service";
import { LoginLogService } from "../../../common/services/login-log.service";
import { IdConverterService } from "./id-converter.service";
import { PartitionService } from "./partition.service";
import * as XLSX from "xlsx";
import dayjs from "dayjs";

function normalizeDate(value?: string) {
  if (!value) {
    return undefined;
  }
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new BadRequestException("日期格式无效");
  }
  return date;
}

@Injectable()
export class SystemLogsService {
  private readonly logger = new Logger(SystemLogsService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly auditLogService: AuditLogService,
    private readonly loginLogService: LoginLogService,
    private readonly idConverterService: IdConverterService,
    private readonly partitionService: PartitionService,
  ) {}

  /**
   * 检查用户是否有日志查看权限
   * Requirements: 20.1, 20.2, 20.3
   *
   * 权限规则:
   * - super_admin (超级管理员): 可查询所有日志
   * - auditor (审计员): 可查询所有日志
   * - regular_admin (普通管理员): 可查询本部门/平台日志
   * - regular_user (普通用户): 拒绝访问
   */
  private async checkLogAccessPermission(userId: string): Promise<void> {
    const userRoles = await this.prisma.sys_user_role.findMany({
      where: { user_id: userId },
      include: { role: true },
    });

    const roleCodes = userRoles.map((item: any) => item.role.role_code);

    // 超级管理员和审计员有全量查询权限
    if (roleCodes.includes('super_admin') || roleCodes.includes('auditor')) {
      return;
    }

    // 普通管理员有部门/平台数据查询权限
    if (roleCodes.includes('regular_admin') || roleCodes.includes('admin')) {
      return;
    }

    // 普通用户拒绝访问
    throw new ForbiddenException('无权访问日志数据，请联系管理员');
  }

  /**
   * 日志数据不可篡改性保证
   * Requirements: 12.1, 12.2, 12.3, 12.4
   *
   * 日志系统仅支持 INSERT 和 SELECT 操作，不提供任何 DELETE、EDIT 或 UPDATE 接口。
   * 任何角色（包括超级管理员）尝试删除或编辑日志时都会返回权限拒绝错误。
   *
   * 实现策略:
   * 1. 不暴露任何 update/delete 方法
   * 2. 数据库层面通过 Prisma 配置强制权限控制
   * 3. 所有修改尝试都会被拦截并返回错误
   */

  /**
   * 删除操作日志 - 明确拒绝
   * Requirements: 12.1, 12.2, 12.4
   *
   * @throws ForbiddenException 任何删除尝试都会被拒绝
   */
  async deleteOperationLog(logId: string): Promise<never> {
    throw new ForbiddenException(
      '日志数据不可删除。日志系统仅支持查询操作，不支持删除、编辑或更新操作，以确保审计数据的完整性和可信度。'
    );
  }

  /**
   * 删除登录日志 - 明确拒绝
   * Requirements: 12.1, 12.2, 12.4
   *
   * @throws ForbiddenException 任何删除尝试都会被拒绝
   */
  async deleteLoginLog(logId: string): Promise<never> {
    throw new ForbiddenException(
      '日志数据不可删除。日志系统仅支持查询操作，不支持删除、编辑或更新操作，以确保审计数据的完整性和可信度。'
    );
  }

  /**
   * 更新操作日志 - 明确拒绝
   * Requirements: 12.1, 12.2, 12.4
   *
   * @throws ForbiddenException 任何更新尝试都会被拒绝
   */
  async updateOperationLog(logId: string, data: any): Promise<never> {
    throw new ForbiddenException(
      '日志数据不可修改。日志系统仅支持查询操作，不支持删除、编辑或更新操作，以确保审计数据的完整性和可信度。'
    );
  }

  /**
   * 更新登录日志 - 明确拒绝
   * Requirements: 12.1, 12.2, 12.4
   *
   * @throws ForbiddenException 任何更新尝试都会被拒绝
   */
  async updateLoginLog(logId: string, data: any): Promise<never> {
    throw new ForbiddenException(
      '日志数据不可修改。日志系统仅支持查询操作，不支持删除、编辑或更新操作，以确保审计数据的完整性和可信度。'
    );
  }

  /**
   * 批量删除操作日志 - 明确拒绝
   * Requirements: 12.1, 12.2, 12.4
   *
   * @throws ForbiddenException 任何批量删除尝试都会被拒绝
   */
  async batchDeleteOperationLogs(logIds: string[]): Promise<never> {
    throw new ForbiddenException(
      '日志数据不可删除。日志系统仅支持查询操作，不支持删除、编辑或更新操作，以确保审计数据的完整性和可信度。'
    );
  }

  /**
   * 批量删除登录日志 - 明确拒绝
   * Requirements: 12.1, 12.2, 12.4
   *
   * @throws ForbiddenException 任何批量删除尝试都会被拒绝
   */
  async batchDeleteLoginLogs(logIds: string[]): Promise<never> {
    throw new ForbiddenException(
      '日志数据不可删除。日志系统仅支持查询操作，不支持删除、编辑或更新操作，以确保审计数据的完整性和可信度。'
    );
  }

  // ✅ 优化：使用 IdConverterService 批量转换ID为真实名称
  // Requirements: 13.5, 3.1, 3.2, 3.3, 3.4, 3.5
  private async mapIdsToNames(items: any[]) {
    if (items.length === 0) return items;

    // 收集所有需要转换的ID
    const userIds = [...new Set(items.map((i) => i.user_id).filter(Boolean))];
    const platformIds = [
      ...new Set(items.map((i) => i.platform_id).filter(Boolean)),
    ];
    const deptIds = [...new Set(items.map((i) => i.dept_id).filter(Boolean))];
    const shopIds = [...new Set(items.map((i) => i.shop_id).filter(Boolean))];

    // 使用 IdConverterService 批量转换
    const [userMap, platformMap, deptMap, shopMap] = await Promise.all([
      this.idConverterService.convertUserIds(userIds as string[]),
      this.idConverterService.convertPlatformIds(platformIds as string[]),
      this.idConverterService.convertDepartmentIds(deptIds as string[]),
      this.idConverterService.convertShopIds(shopIds as string[]),
    ]);

    return items.map((item) => {
      const getDisplayName = (
        id: string | null,
        map: Map<string, string>,
        defaultValue: string,
      ) => {
        if (!id) return "-";
        return map.get(id) || defaultValue;
      };

      return {
        ...item,
        operator_name: getDisplayName(item.user_id, userMap, "未知用户"),
        platform_name: getDisplayName(item.platform_id, platformMap, "未知平台"),
        dept_name: getDisplayName(item.dept_id, deptMap, "未知部门"),
        shop_name: getDisplayName(item.shop_id, shopMap, "未知店铺"),
      };
    });
  }

  async listLoginLogs(user: CurrentUserPayload, query: QuerySystemLogsDto) {
    // Requirements 20.1, 20.2, 20.3: 权限控制检查
    await this.checkLogAccessPermission(user.sub);

    const { where, page, pageSize, isDateCorrected, isKeywordTruncated, startDate, endDate } =
      await this.buildWhere(user, query);

    let items: any[];
    let total: number;

    // Requirements 13.1: 实现跨月分表查询逻辑
    if (startDate && endDate) {
      // 使用 PartitionService 进行跨月查询
      try {
        items = await this.partitionService.queryLoginLogsAcrossPartitions(
          startDate,
          endDate,
          where,
          { create_time: "desc" },
          (page - 1) * pageSize,
          pageSize,
        );

        // 计算总数 (跨分表查询)
        total = await this.countLoginLogsAcrossPartitions(startDate, endDate, where);
      } catch (error) {
        this.logger.error("Failed to query across partitions, falling back to main table", error);
        // 降级到主表查询
        [items, total] = await Promise.all([
          this.prisma.sys_login_log.findMany({
            where,
            orderBy: { create_time: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          this.prisma.sys_login_log.count({ where }),
        ]);
      }
    } else {
      // 没有时间范围，直接查询主表
      [items, total] = await Promise.all([
        this.prisma.sys_login_log.findMany({
          where,
          orderBy: { create_time: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.sys_login_log.count({ where }),
      ]);
    }

    const mappedItems = await this.mapIdsToNames(items);
    return {
      items: mappedItems,
      total,
      meta: { isDateCorrected, isKeywordTruncated },
    };
  }

  async listOperationLogs(user: CurrentUserPayload, query: QuerySystemLogsDto) {
    // Requirements 20.1, 20.2, 20.3: 权限控制检查
    await this.checkLogAccessPermission(user.sub);

    const { where, page, pageSize, isDateCorrected, isKeywordTruncated, startDate, endDate } =
      await this.buildWhere(user, query);

    let items: any[];
    let total: number;

    // Requirements 13.1: 实现跨月分表查询逻辑
    if (startDate && endDate) {
      // 使用 PartitionService 进行跨月查询
      try {
        items = await this.partitionService.queryOperationLogsAcrossPartitions(
          startDate,
          endDate,
          where,
          { create_time: "desc" },
          (page - 1) * pageSize,
          pageSize,
        );

        // 计算总数 (跨分表查询)
        total = await this.countOperationLogsAcrossPartitions(startDate, endDate, where);
      } catch (error) {
        this.logger.error("Failed to query across partitions, falling back to main table", error);
        // 降级到主表查询
        [items, total] = await Promise.all([
          this.prisma.sys_operation_log.findMany({
            where,
            orderBy: { create_time: "desc" },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          this.prisma.sys_operation_log.count({ where }),
        ]);
      }
    } else {
      // 没有时间范围，直接查询主表
      [items, total] = await Promise.all([
        this.prisma.sys_operation_log.findMany({
          where,
          orderBy: { create_time: "desc" },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        this.prisma.sys_operation_log.count({ where }),
      ]);
    }

    const mappedItems = await this.mapIdsToNames(items);
    return {
      items: mappedItems,
      total,
      meta: { isDateCorrected, isKeywordTruncated },
    };
  }

  /**
   * 构建查询条件并应用权限控制
   * Requirements: 20.1, 20.2, 20.3, 20.4
   */
  private async buildWhere(user: CurrentUserPayload, query: any) {
    let startDate = normalizeDate(query.start_date);
    let endDate = normalizeDate(query.end_date);

    // Requirements 14.2: 自动纠正日期范围 (结束时间早于开始时间)
    let isDateCorrected = false;
    if (startDate && endDate && startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
      isDateCorrected = true;
    }

    // Requirements 14.1: 默认展示最近 30 天日志
    if (!startDate && !endDate && !query.keyword && !query.username) {
      endDate = new Date();
      startDate = dayjs().subtract(30, "days").toDate();
    }

    // Requirements 15.1, 15.2: 分页大小选项 (10, 20, 50, 100) 和页码自动校正
    let page = query.page || 1;
    let pageSize = query.pageSize || 20;

    // Requirements 15.2: 页码自动校正 (非法页码处理)
    if (page < 1) {
      page = 1;
    }

    // Requirements 15.1: 限制分页大小选项
    const validPageSizes = [10, 20, 50, 100];
    if (!validPageSizes.includes(pageSize)) {
      pageSize = 20; // 默认值
    }

    // Requirements 14.4: 搜索关键词过长截取 (50字符)
    let keyword = query.keyword;
    let isKeywordTruncated = false;
    if (keyword && keyword.length > 50) {
      keyword = keyword.slice(0, 50);
      isKeywordTruncated = true;
    }

    // Requirements 13.2, 13.3, 13.4: 多条件组合查询 (AND 逻辑)
    const baseWhere: any = {
      is_deleted: 0,
      ...(query.username ? { username: { contains: query.username } } : {}),
      ...(query.platform_id ? { platform_id: query.platform_id } : {}),
      ...(query.dept_id ? { dept_id: query.dept_id } : {}),
      ...(query.shop_id ? { shop_id: query.shop_id } : {}),
      ...(query.module ? { operation_module: query.module } : {}),
      // Requirements 13.3: 登录日志设备信息筛选（模糊搜索）
      ...(query.user_agent
        ? { user_agent: { contains: query.user_agent } }
        : {}),
    };

    // Requirements 13.3: 模糊搜索 (操作人、登录用户、设备信息)
    if (keyword) {
      baseWhere.OR = [
        { username: { contains: keyword } },
        { operation_module: { contains: keyword } },
        { operation_message: { contains: keyword } },
        { login_message: { contains: keyword } },
        { login_ip: { contains: keyword } },
        { user_agent: { contains: keyword } },
      ];
    }

    if (query.status !== undefined) {
      baseWhere.operation_status = query.status;
      baseWhere.login_status = query.status;
    }

    // Requirements 13.4: 时间范围查询优化
    if (startDate || endDate) {
      baseWhere.create_time = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    // Requirements 20.1, 20.2, 20.3, 20.4: 基于角色的权限控制
    // 超级管理员(super_admin)和审计员(auditor): 可查询所有日志
    // 普通管理员(regular_admin): 仅可查询本部门/平台的日志
    // 普通用户(regular_user): 拒绝访问
    const scope = await this.scopeService.resolveAccess(user.sub);

    // Apply data scope filtering based on role
    const where = this.scopeService.applyScope(baseWhere, scope, {
      platform: "platform_id",
      department: "dept_id",
      shop: "shop_id",
    });

    return {
      where,
      page,
      pageSize,
      isDateCorrected,
      isKeywordTruncated,
      startDate,
      endDate,
    };
  }

  /**
   * 导出日志数据到Excel
   * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 17.6, 18.1, 18.2, 18.3, 18.4
   *
   * @param user 当前用户
   * @param type 日志类型 (login | operation)
   * @param query 查询条件
   * @returns Excel文件buffer和文件名
   */
  async exportLogs(
    user: CurrentUserPayload,
    type: "login" | "operation",
    query: QuerySystemLogsDto,
  ): Promise<{ buffer: Buffer; filename: string }> {
    // Requirements 20.1, 20.2, 20.3: 权限控制检查
    await this.checkLogAccessPermission(user.sub);

    try {
      const { where, page, pageSize, startDate, endDate } = await this.buildWhere(user, query);

      // Requirements 18.3: 空结果导出拦截
      let totalCount: number;
      if (type === "login") {
        if (startDate && endDate) {
          totalCount = await this.countLoginLogsAcrossPartitions(startDate, endDate, where);
        } else {
          totalCount = await this.prisma.sys_login_log.count({ where });
        }
      } else {
        if (startDate && endDate) {
          totalCount = await this.countOperationLogsAcrossPartitions(startDate, endDate, where);
        } else {
          totalCount = await this.prisma.sys_operation_log.count({ where });
        }
      }

      if (totalCount === 0) {
        throw new Error("无匹配日志，无法导出");
      }

      // Requirements 17.1, 17.2: 支持当前页导出和全部结果导出
      const exportType = query.exportType || 'all';
      let items: any[] = [];
      let exportCount: number;

      if (exportType === 'current') {
        // 导出当前页
        exportCount = Math.min(pageSize, totalCount);
        if (type === "login") {
          if (startDate && endDate) {
            items = await this.partitionService.queryLoginLogsAcrossPartitions(
              startDate,
              endDate,
              where,
              { create_time: "desc" },
              (page - 1) * pageSize,
              pageSize,
            );
          } else {
            items = await this.prisma.sys_login_log.findMany({
              where,
              orderBy: { create_time: "desc" },
              skip: (page - 1) * pageSize,
              take: pageSize,
            });
          }
        } else {
          if (startDate && endDate) {
            items = await this.partitionService.queryOperationLogsAcrossPartitions(
              startDate,
              endDate,
              where,
              { create_time: "desc" },
              (page - 1) * pageSize,
              pageSize,
            );
          } else {
            items = await this.prisma.sys_operation_log.findMany({
              where,
              orderBy: { create_time: "desc" },
              skip: (page - 1) * pageSize,
              take: pageSize,
            });
          }
        }
      } else {
        // 导出全部结果
        // Requirements 18.1: 大数据量导出限制 (10万条)
        if (totalCount > 100000) {
          throw new Error("数据量过大（超过10万条），建议分批次导出");
        }

        exportCount = totalCount;
        if (type === "login") {
          if (startDate && endDate) {
            items = await this.partitionService.queryLoginLogsAcrossPartitions(
              startDate,
              endDate,
              where,
              { create_time: "desc" },
              0,
              100000,
            );
          } else {
            items = await this.prisma.sys_login_log.findMany({
              where,
              orderBy: { create_time: "desc" },
              take: 100000,
            });
          }
        } else {
          if (startDate && endDate) {
            items = await this.partitionService.queryOperationLogsAcrossPartitions(
              startDate,
              endDate,
              where,
              { create_time: "desc" },
              0,
              100000,
            );
          } else {
            items = await this.prisma.sys_operation_log.findMany({
              where,
              orderBy: { create_time: "desc" },
              take: 100000,
            });
          }
        }
      }

      // Requirements 17.5: 确保导出数据包含所有转换后的真实名称
      const mappedItems = await this.mapIdsToNames(items);

      // Requirements 17.6: 导出字段顺序与前端列表一致
      const exportData = mappedItems.map((item) => {
        if (type === "login") {
          return {
            登录时间: dayjs(item.create_time).format("YYYY-MM-DD HH:mm:ss"),
            登录人: item.operator_name,
            用户名: item.username,
            登录IP: item.login_ip || "-",
            登录状态: item.login_status === 1 ? "成功" : "失败",
            结果描述: item.login_message || "-",
            所属平台: item.platform_name,
            设备信息: item.user_agent || "-",
          };
        } else {
          return {
            操作时间: dayjs(item.create_time).format("YYYY-MM-DD HH:mm:ss"),
            操作人: item.operator_name,
            操作模块: item.operation_module || "-",
            操作接口: item.api_path,
            请求方式: item.request_method,
            操作状态: item.operation_status === 1 ? "成功" : "失败",
            详细描述: item.operation_message || "-",
            操作IP: item.request_ip || "-",
            所属平台: item.platform_name,
            所属部门: item.dept_name,
            所属店铺: item.shop_name,
          };
        }
      });

      // Requirements 17.3: 优化 Excel 生成性能 (使用流式写入)
      // Note: XLSX library doesn't support true streaming, but we optimize by processing in chunks
      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "日志报表");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });

      // Requirements 17.4: 实现导出文件命名规范 ("操作日志_YYYYMMDD_HHmmss.xlsx")
      const timestamp = dayjs().format("YYYYMMDD_HHmmss");
      const filename = type === "login"
        ? `登录日志_${timestamp}.xlsx`
        : `操作日志_${timestamp}.xlsx`;

      // 记录导出成功审计
      void this.auditLogService.logOperation({
        user_id: user.sub,
        username: user.username,
        request_method: "GET",
        api_path: `/system/logs/${type}/export`,
        operation_module: "审计日志",
        operation_status: 1,
        operation_message: `导出${type === "login" ? "登录" : "操作"}日志报表成功，共${exportCount}条记录`,
        platform_id: user.platform_id,
        dept_id: user.dept_id,
        shop_id: user.shop_id,
      });

      return { buffer, filename };
    } catch (error) {
      // Requirements 18.4: 记录导出异常日志和触发告警
      this.logger.error(`Export logs failed: ${error instanceof Error ? error.message : String(error)}`);

      void this.auditLogService.logOperation({
        user_id: user.sub,
        username: user.username,
        request_method: "GET",
        api_path: `/system/logs/${type}/export`,
        operation_module: "审计日志",
        operation_status: 0,
        operation_message: `导出${type === "login" ? "登录" : "操作"}日志报表失败，原因：${error instanceof Error ? error.message : String(error)}`,
        platform_id: user.platform_id,
        dept_id: user.dept_id,
        shop_id: user.shop_id,
      });

      throw error;
    }
  }

  /**
   * 跨分表统计操作日志总数
   * Requirements: 13.1, 16.3
   */
  private async countOperationLogsAcrossPartitions(
    startDate: Date,
    endDate: Date,
    where: any,
  ): Promise<number> {
    const tableNames = this.partitionService.getPartitionTableNames(
      'sys_operation_log',
      startDate,
      endDate,
    );

    // 检查哪些分表存在
    const existingTables: string[] = [];
    for (const tableName of tableNames) {
      const exists = await this.partitionService.checkTableExists(tableName);
      if (exists) {
        existingTables.push(tableName);
      }
    }

    // 如果没有分表存在，查询主表
    if (existingTables.length === 0) {
      return this.prisma.sys_operation_log.count({
        where: {
          ...where,
          create_time: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    }

    try {
      // 构建 UNION ALL 查询统计
      const unionQueries = existingTables.map(tableName => {
        return `SELECT COUNT(*) as count FROM ${tableName} WHERE create_time >= ? AND create_time <= ?`;
      });

      // 添加主表查询
      unionQueries.push(`SELECT COUNT(*) as count FROM sys_operation_log WHERE create_time >= ? AND create_time <= ?`);

      const unionQuery = unionQueries.join(' UNION ALL ');
      const finalQuery = `SELECT SUM(count) as total FROM (${unionQuery}) AS combined`;

      // 准备参数
      const params: any[] = [];
      for (let i = 0; i < unionQueries.length; i++) {
        params.push(startDate, endDate);
      }

      const results = await this.prisma.$queryRawUnsafe<any[]>(finalQuery, ...params);
      return results[0]?.total || 0;
    } catch (error) {
      this.logger.error('Failed to count across partitions', error);
      // 降级到主表统计
      return this.prisma.sys_operation_log.count({
        where: {
          ...where,
          create_time: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    }
  }

  /**
   * 跨分表统计登录日志总数
   * Requirements: 13.1, 16.3
   */
  private async countLoginLogsAcrossPartitions(
    startDate: Date,
    endDate: Date,
    where: any,
  ): Promise<number> {
    const tableNames = this.partitionService.getPartitionTableNames(
      'sys_login_log',
      startDate,
      endDate,
    );

    // 检查哪些分表存在
    const existingTables: string[] = [];
    for (const tableName of tableNames) {
      const exists = await this.partitionService.checkTableExists(tableName);
      if (exists) {
        existingTables.push(tableName);
      }
    }

    // 如果没有分表存在，查询主表
    if (existingTables.length === 0) {
      return this.prisma.sys_login_log.count({
        where: {
          ...where,
          create_time: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    }

    try {
      // 构建 UNION ALL 查询统计
      const unionQueries = existingTables.map(tableName => {
        return `SELECT COUNT(*) as count FROM ${tableName} WHERE create_time >= ? AND create_time <= ?`;
      });

      // 添加主表查询
      unionQueries.push(`SELECT COUNT(*) as count FROM sys_login_log WHERE create_time >= ? AND create_time <= ?`);

      const unionQuery = unionQueries.join(' UNION ALL ');
      const finalQuery = `SELECT SUM(count) as total FROM (${unionQuery}) AS combined`;

      // 准备参数
      const params: any[] = [];
      for (let i = 0; i < unionQueries.length; i++) {
        params.push(startDate, endDate);
      }

      const results = await this.prisma.$queryRawUnsafe<any[]>(finalQuery, ...params);
      return results[0]?.total || 0;
    } catch (error) {
      this.logger.error('Failed to count across partitions', error);
      // 降级到主表统计
      return this.prisma.sys_login_log.count({
        where: {
          ...where,
          create_time: {
            gte: startDate,
            lte: endDate,
          },
        },
      });
    }
  }

  /**
   * 前端错误上报处理 (V1.0)
   * 职责：接收前端ErrorBoundary捕获的错误，持久化到sys_error_log
   *
   * @param dto 前端错误信息
   * @param user 当前用户（可选，未登录时为undefined）
   */
  async reportFrontendError(
    dto: FrontendErrorReportDto,
    user?: CurrentUserPayload,
  ) {
    try {
      this.logger.error(
        `[Frontend Error] ${dto.error} | URL: ${dto.url} | User: ${user?.username || "Anonymous"}`,
      );

      await this.prisma.sys_error_log.create({
        data: {
          user_id: user?.sub || null,
          username: user?.username || "Anonymous",
          request_method: "FRONTEND",
          api_path: dto.url,
          request_params: {
            userAgent: dto.userAgent,
            timestamp: dto.timestamp,
          },
          error_message: `[Frontend] ${dto.error}`,
          stack_trace: dto.stack
            ? `${dto.stack}\n\n=== Component Stack ===\n${dto.componentStack || "N/A"}`
            : dto.componentStack || "No stack trace available",
          platform_id: user?.platform_id || null,
          dept_id: user?.dept_id || null,
        },
      });

      return { success: true, message: "错误已上报" };
    } catch (error) {
      this.logger.error("Failed to report frontend error:", error);
      return { success: false, message: "错误上报失败，但不影响使用" };
    }
  }
}
