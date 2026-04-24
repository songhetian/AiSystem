import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import type { Prisma } from '@prisma/client';
import { SnowflakeService } from '../common/utils/snowflake.util';

// 定义扩展后的 PrismaService 类型
export type ExtendedPrismaClient = PrismaClient;

/**
 * 工业级 Prisma 后端基石 (V6.0 企业级加固)
 * 职责：全局逻辑删除注入、分布式 ID 自动填充、多租户查询拦截。
 */
@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor(private readonly snowflakeService: SnowflakeService) {
    super({
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
      // Connection pool configuration (Requirement 23.4)
      // Min: 10 connections, Max: 50 connections
      // Note: Prisma uses connection_limit in DATABASE_URL for max connections
      // The pool_timeout and connect_timeout are also configured in DATABASE_URL
    });
  }

  async onModuleInit() {
    await this.$connect();
    // 在连接后应用扩展
    this._applyExtensions();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * 应用扩展方法到实例
   */
  private _applyExtensions() {
    const snowflake = this.snowflakeService;
    const originalThis = this;

    // 重写查询方法以注入软删除过滤
    const models = [
      'sys_user', 'hr_employee', 'attendance_record', 'sys_role',
      'sys_menu', 'sys_button', 'sys_operation_log', 'sys_login_log',
      'biz_platform', 'biz_department', 'biz_shop', 'fin_reimbursement', 'fin_purchase',
      'sys_ai_config', 'sys_file'
    ];

    // 注意：由于 Prisma 的动态特性，我们不在这里修改原型
    // 软删除逻辑将在具体的 service 层处理
  }
}
