import { BadRequestException, Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { QuerySystemLogsDto } from "../dto/query-system-logs.dto";
import { FrontendErrorReportDto } from "../dto/frontend-error-report.dto";
import { CurrentUserPayload } from "../../../common/current-user.decorator";
import { ScopeService } from "../../../common/services/scope.service";
import { AuditLogService } from "../../../common/services/audit-log.service";
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
  ) {}

  // ✅ 优化：使用 select 只查询需要的字段，减少数据传输量
  private async mapIdsToNames(items: any[]) {
    if (items.length === 0) return items;

    const userIds = [...new Set(items.map((i) => i.user_id).filter(Boolean))];
    const platformIds = [
      ...new Set(items.map((i) => i.platform_id).filter(Boolean)),
    ];
    const deptIds = [...new Set(items.map((i) => i.dept_id).filter(Boolean))];
    const shopIds = [...new Set(items.map((i) => i.shop_id).filter(Boolean))];

    const [users, platforms, depts, shops] = await Promise.all([
      this.prisma.sys_user.findMany({
        where: { id: { in: userIds as string[] } },
        select: { id: true, name: true }, // ✅ 只查询 id 和 name
      }),
      this.prisma.biz_platform.findMany({
        where: { id: { in: platformIds as string[] } },
        select: { id: true, name: true }, // ✅ 只查询 id 和 name
      }),
      this.prisma.biz_department.findMany({
        where: { id: { in: deptIds as string[] } },
        select: { id: true, name: true }, // ✅ 只查询 id 和 name
      }),
      this.prisma.biz_shop.findMany({
        where: { id: { in: shopIds as string[] } },
        select: { id: true, name: true }, // ✅ 只查询 id 和 name
      }),
    ]);

    const userMap = new Map(users.map((u) => [u.id, u.name]));
    const platformMap = new Map(platforms.map((p) => [p.id, p.name]));
    const deptMap = new Map(depts.map((d) => [d.id, d.name]));
    const shopMap = new Map(shops.map((s) => [s.id, s.name]));

    return items.map((item) => {
      const getDisplayName = (
        id: string | null,
        map: Map<string, string>,
        type: string,
      ) => {
        if (!id) return "-";
        const name = map.get(id);
        if (name) return name;
        return `已删除${type} (ID: ${id})`;
      };

      return {
        ...item,
        operator_name: getDisplayName(item.user_id, userMap, "用户"),
        platform_name: getDisplayName(item.platform_id, platformMap, "平台"),
        dept_name: getDisplayName(item.dept_id, deptMap, "部门"),
        shop_name: getDisplayName(item.shop_id, shopMap, "店铺"),
      };
    });
  }

  async listLoginLogs(user: CurrentUserPayload, query: QuerySystemLogsDto) {
    const { where, page, pageSize, isDateCorrected, isKeywordTruncated } =
      await this.buildWhere(user, query);

    const [items, total] = await Promise.all([
      this.prisma.sys_login_log.findMany({
        where,
        orderBy: { create_time: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sys_login_log.count({ where }),
    ]);

    const mappedItems = await this.mapIdsToNames(items);
    return {
      items: mappedItems,
      total,
      meta: { isDateCorrected, isKeywordTruncated },
    };
  }

  async listOperationLogs(user: CurrentUserPayload, query: QuerySystemLogsDto) {
    const { where, page, pageSize, isDateCorrected, isKeywordTruncated } =
      await this.buildWhere(user, query);

    const [items, total] = await Promise.all([
      this.prisma.sys_operation_log.findMany({
        where,
        orderBy: { create_time: "desc" },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.sys_operation_log.count({ where }),
    ]);

    const mappedItems = await this.mapIdsToNames(items);
    return {
      items: mappedItems,
      total,
      meta: { isDateCorrected, isKeywordTruncated },
    };
  }

  private async buildWhere(user: CurrentUserPayload, query: any) {
    let startDate = normalizeDate(query.start_date);
    let endDate = normalizeDate(query.end_date);

    // 1. 自动纠正日期范围 (V2.0)
    if (startDate && endDate && startDate > endDate) {
      const temp = startDate;
      startDate = endDate;
      endDate = temp;
    }

    // 2. 默认展示最近 30 天日志 (V2.0 异常处理 1)
    if (!startDate && !endDate && !query.keyword && !query.username) {
      endDate = new Date();
      startDate = dayjs().subtract(30, "days").toDate();
    }

    const page = query.page || 1;
    const pageSize = query.pageSize || 10;

    // 3. 搜索关键词过长截取 (V2.0 异常处理 4)
    let keyword = query.keyword;
    if (keyword && keyword.length > 50) {
      keyword = keyword.slice(0, 50);
    }

    const baseWhere: any = {
      is_deleted: 0,
      ...(query.username ? { username: { contains: query.username } } : {}),
      ...(query.platform_id ? { platform_id: query.platform_id } : {}),
      ...(query.dept_id ? { dept_id: query.dept_id } : {}),
      ...(query.shop_id ? { shop_id: query.shop_id } : {}),
      ...(query.module ? { operation_module: query.module } : {}),
      // ✅ 新增：登录日志设备信息筛选（PRD 2.3.1）
      ...(query.user_agent
        ? { user_agent: { contains: query.user_agent } }
        : {}),
    };

    if (keyword) {
      baseWhere.OR = [
        { username: { contains: keyword } },
        { operation_module: { contains: keyword } },
        { operation_message: { contains: keyword } },
        { login_message: { contains: keyword } },
        { login_ip: { contains: keyword } },
      ];
    }

    if (query.status !== undefined) {
      baseWhere.operation_status = query.status;
      baseWhere.login_status = query.status;
    }

    if (startDate || endDate) {
      baseWhere.create_time = {
        ...(startDate ? { gte: startDate } : {}),
        ...(endDate ? { lte: endDate } : {}),
      };
    }

    // Apply scope
    const scope = await this.scopeService.resolveAccess(user.sub);
    const where = this.scopeService.applyScope(baseWhere, scope, {
      platform: "platform_id",
      department: "dept_id",
      shop: "shop_id",
    });

    return {
      where,
      page,
      pageSize,
      isDateCorrected:
        query.start_date &&
        query.end_date &&
        normalizeDate(query.start_date)! > normalizeDate(query.end_date)!,
      isKeywordTruncated: query.keyword && query.keyword.length > 50,
    };
  }

  async exportLogs(
    user: CurrentUserPayload,
    type: "login" | "operation",
    query: QuerySystemLogsDto,
  ) {
    try {
      const { where } = await this.buildWhere(user, query);

      let items: any[] = [];
      if (type === "login") {
        items = await this.prisma.sys_login_log.findMany({
          where,
          orderBy: { create_time: "desc" },
          take: 10000, // Limit for performance
        });
      } else {
        items = await this.prisma.sys_operation_log.findMany({
          where,
          orderBy: { create_time: "desc" },
          take: 10000,
        });
      }

      if (items.length === 0) {
        throw new Error("无匹配日志，无法导出");
      }

      const mappedItems = await this.mapIdsToNames(items);

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

      const worksheet = XLSX.utils.json_to_sheet(exportData);
      const workbook = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(workbook, worksheet, "日志报表");

      const buffer = XLSX.write(workbook, { type: "buffer", bookType: "xlsx" });
      return buffer;
    } catch (error) {
      // 记录导出失败审计 (V2.1 工业级精修)
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
