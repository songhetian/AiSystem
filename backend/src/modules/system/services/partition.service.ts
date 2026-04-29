import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * PartitionService - 数据库分表管理服务
 *
 * 职责:
 * 1. 自动创建月度分表 (sys_operation_log_YYYYMM, sys_login_log_YYYYMM)
 * 2. 支持跨月查询数据聚合
 * 3. 管理分表索引
 *
 * Requirements: 24.1, 24.2, 24.3
 */
@Injectable()
export class PartitionService {
  private readonly logger = new Logger(PartitionService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 生成月度分表名称
   * @param baseTableName 基础表名 (sys_operation_log 或 sys_login_log)
   * @param date 日期
   * @returns 分表名称 (例如: sys_operation_log_202401)
   */
  getPartitionTableName(baseTableName: string, date: Date): string {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    return `${baseTableName}_${year}${month}`;
  }

  /**
   * 检查分表是否存在
   * @param tableName 表名
   * @returns 是否存在
   */
  async checkTableExists(tableName: string): Promise<boolean> {
    try {
      const result = await this.prisma.$queryRawUnsafe<any[]>(
        `SHOW TABLES LIKE '${tableName}'`
      );
      return result.length > 0;
    } catch (error) {
      this.logger.error(`Failed to check table existence: ${tableName}`, error);
      return false;
    }
  }

  /**
   * 创建操作日志月度分表
   * @param date 日期
   * @returns 是否创建成功
   */
  async createOperationLogPartition(date: Date): Promise<boolean> {
    const tableName = this.getPartitionTableName('sys_operation_log', date);

    try {
      // 检查表是否已存在
      const exists = await this.checkTableExists(tableName);
      if (exists) {
        this.logger.log(`Table ${tableName} already exists, skipping creation`);
        return true;
      }

      // 创建分表 (复制主表结构)
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE ${tableName} LIKE sys_operation_log
      `);

      // 创建索引以优化查询性能
      await this.createOperationLogIndexes(tableName);

      this.logger.log(`Successfully created partition table: ${tableName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to create partition table: ${tableName}`, error);
      return false;
    }
  }

  /**
   * 创建登录日志月度分表
   * @param date 日期
   * @returns 是否创建成功
   */
  async createLoginLogPartition(date: Date): Promise<boolean> {
    const tableName = this.getPartitionTableName('sys_login_log', date);

    try {
      // 检查表是否已存在
      const exists = await this.checkTableExists(tableName);
      if (exists) {
        this.logger.log(`Table ${tableName} already exists, skipping creation`);
        return true;
      }

      // 创建分表 (复制主表结构)
      await this.prisma.$executeRawUnsafe(`
        CREATE TABLE ${tableName} LIKE sys_login_log
      `);

      // 创建索引以优化查询性能
      await this.createLoginLogIndexes(tableName);

      this.logger.log(`Successfully created partition table: ${tableName}`);
      return true;
    } catch (error) {
      this.logger.error(`Failed to create partition table: ${tableName}`, error);
      return false;
    }
  }

  /**
   * 为操作日志分表创建索引
   * @param tableName 表名
   */
  private async createOperationLogIndexes(tableName: string): Promise<void> {
    const indexes = [
      `CREATE INDEX idx_${tableName}_platform_dept ON ${tableName}(platform_id, dept_id)`,
      `CREATE INDEX idx_${tableName}_user_time ON ${tableName}(user_id, create_time)`,
      `CREATE INDEX idx_${tableName}_module_time ON ${tableName}(operation_module, create_time)`,
      `CREATE INDEX idx_${tableName}_status_time ON ${tableName}(operation_status, create_time)`,
      `CREATE INDEX idx_${tableName}_create_time ON ${tableName}(create_time)`,
      `CREATE INDEX idx_${tableName}_username_time ON ${tableName}(username, create_time)`,
    ];

    for (const indexSql of indexes) {
      try {
        await this.prisma.$executeRawUnsafe(indexSql);
      } catch (error) {
        this.logger.warn(`Failed to create index: ${indexSql}`, error);
      }
    }
  }

  /**
   * 为登录日志分表创建索引
   * @param tableName 表名
   */
  private async createLoginLogIndexes(tableName: string): Promise<void> {
    const indexes = [
      `CREATE INDEX idx_${tableName}_username_time ON ${tableName}(username, create_time)`,
      `CREATE INDEX idx_${tableName}_status_time ON ${tableName}(login_status, create_time)`,
      `CREATE INDEX idx_${tableName}_platform ON ${tableName}(platform_id)`,
      `CREATE INDEX idx_${tableName}_user_id ON ${tableName}(user_id)`,
    ];

    for (const indexSql of indexes) {
      try {
        await this.prisma.$executeRawUnsafe(indexSql);
      } catch (error) {
        this.logger.warn(`Failed to create index: ${indexSql}`, error);
      }
    }
  }

  /**
   * 获取时间范围内的所有分表名称
   * @param baseTableName 基础表名
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @returns 分表名称列表
   */
  getPartitionTableNames(
    baseTableName: string,
    startDate: Date,
    endDate: Date
  ): string[] {
    const tables: string[] = [];
    const current = new Date(startDate.getFullYear(), startDate.getMonth(), 1);
    const end = new Date(endDate.getFullYear(), endDate.getMonth(), 1);

    while (current <= end) {
      tables.push(this.getPartitionTableName(baseTableName, current));
      current.setMonth(current.getMonth() + 1);
    }

    return tables;
  }

  /**
   * 跨月查询操作日志
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param where 查询条件
   * @param orderBy 排序
   * @param skip 跳过记录数
   * @param take 获取记录数
   * @returns 查询结果
   */
  async queryOperationLogsAcrossPartitions(
    startDate: Date,
    endDate: Date,
    where: any = {},
    orderBy: any = { create_time: 'desc' },
    skip: number = 0,
    take: number = 20
  ): Promise<any[]> {
    const tableNames = this.getPartitionTableNames('sys_operation_log', startDate, endDate);

    // 检查哪些分表存在
    const existingTables: string[] = [];
    for (const tableName of tableNames) {
      const exists = await this.checkTableExists(tableName);
      if (exists) {
        existingTables.push(tableName);
      }
    }

    // 如果没有分表存在，查询主表
    if (existingTables.length === 0) {
      return this.prisma.sys_operation_log.findMany({
        where: {
          ...where,
          create_time: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy,
        skip,
        take,
      });
    }

    // 构建 UNION ALL 查询
    const unionQueries = existingTables.map(tableName => {
      return `SELECT * FROM ${tableName} WHERE create_time >= ? AND create_time <= ?`;
    });

    // 添加主表查询
    unionQueries.push(`SELECT * FROM sys_operation_log WHERE create_time >= ? AND create_time <= ?`);

    const unionQuery = unionQueries.join(' UNION ALL ');
    const finalQuery = `
      SELECT * FROM (${unionQuery}) AS combined
      ORDER BY create_time DESC
      LIMIT ? OFFSET ?
    `;

    // 准备参数
    const params: any[] = [];
    for (let i = 0; i < unionQueries.length; i++) {
      params.push(startDate, endDate);
    }
    params.push(take, skip);

    try {
      const results = await this.prisma.$queryRawUnsafe<any[]>(finalQuery, ...params);
      return results;
    } catch (error) {
      this.logger.error('Failed to query across partitions', error);
      // 降级到主表查询
      return this.prisma.sys_operation_log.findMany({
        where: {
          ...where,
          create_time: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy,
        skip,
        take,
      });
    }
  }

  /**
   * 跨月查询登录日志
   * @param startDate 开始日期
   * @param endDate 结束日期
   * @param where 查询条件
   * @param orderBy 排序
   * @param skip 跳过记录数
   * @param take 获取记录数
   * @returns 查询结果
   */
  async queryLoginLogsAcrossPartitions(
    startDate: Date,
    endDate: Date,
    where: any = {},
    orderBy: any = { create_time: 'desc' },
    skip: number = 0,
    take: number = 20
  ): Promise<any[]> {
    const tableNames = this.getPartitionTableNames('sys_login_log', startDate, endDate);

    // 检查哪些分表存在
    const existingTables: string[] = [];
    for (const tableName of tableNames) {
      const exists = await this.checkTableExists(tableName);
      if (exists) {
        existingTables.push(tableName);
      }
    }

    // 如果没有分表存在，查询主表
    if (existingTables.length === 0) {
      return this.prisma.sys_login_log.findMany({
        where: {
          ...where,
          create_time: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy,
        skip,
        take,
      });
    }

    // 构建 UNION ALL 查询
    const unionQueries = existingTables.map(tableName => {
      return `SELECT * FROM ${tableName} WHERE create_time >= ? AND create_time <= ?`;
    });

    // 添加主表查询
    unionQueries.push(`SELECT * FROM sys_login_log WHERE create_time >= ? AND create_time <= ?`);

    const unionQuery = unionQueries.join(' UNION ALL ');
    const finalQuery = `
      SELECT * FROM (${unionQuery}) AS combined
      ORDER BY create_time DESC
      LIMIT ? OFFSET ?
    `;

    // 准备参数
    const params: any[] = [];
    for (let i = 0; i < unionQueries.length; i++) {
      params.push(startDate, endDate);
    }
    params.push(take, skip);

    try {
      const results = await this.prisma.$queryRawUnsafe<any[]>(finalQuery, ...params);
      return results;
    } catch (error) {
      this.logger.error('Failed to query across partitions', error);
      // 降级到主表查询
      return this.prisma.sys_login_log.findMany({
        where: {
          ...where,
          create_time: {
            gte: startDate,
            lte: endDate,
          },
        },
        orderBy,
        skip,
        take,
      });
    }
  }

  /**
   * 自动创建未来N个月的分表
   * @param months 月数
   * @param logType 日志类型 ('operation' | 'login' | 'both')
   */
  async autoCreatePartitions(
    months: number = 3,
    logType: 'operation' | 'login' | 'both' = 'both'
  ): Promise<void> {
    const now = new Date();

    for (let i = 0; i < months; i++) {
      const targetDate = new Date(now.getFullYear(), now.getMonth() + i, 1);

      if (logType === 'operation' || logType === 'both') {
        await this.createOperationLogPartition(targetDate);
      }

      if (logType === 'login' || logType === 'both') {
        await this.createLoginLogPartition(targetDate);
      }
    }
  }
}
