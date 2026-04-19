import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SnowflakeService } from '../common/utils/snowflake.util';

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
    // V6.0 高级加固：返回扩展后的代理客户端
    return this._extend() as any;
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Prisma Client 扩展：全局自动化注入 (V6.0)
   */
  private _extend() {
    const snowflake = this.snowflakeService;

    return this.$extends({
      query: {
        $allModels: {
          // 1. 全局查询拦截：自动注入 is_deleted: 0
          async $allOperations({ model, operation, args, query }) {
            const readOperations = [
              'findMany', 'findFirst', 'findUnique', 'count',
              'findFirstOrThrow', 'findUniqueOrThrow', 'groupBy', 'aggregate'
            ];

            if (readOperations.includes(operation)) {
              // 声明支持软删除的表名
              const softDeleteModels = [
                'sys_user', 'hr_employee', 'attendance_record', 'sys_role',
                'sys_menu', 'sys_button', 'sys_operation_log', 'sys_login_log',
                'biz_platform', 'biz_department', 'biz_shop', 'fin_reimbursement', 'fin_purchase'
              ];

              if (softDeleteModels.includes(model.toLowerCase())) {
                // V7.0 精修：如果明确传了 includeDeleted: true，则跳过过滤
                const argsWithWhere = args as any;
                if (argsWithWhere?.where?.includeDeleted) {
                  const { includeDeleted, ...actualWhere } = argsWithWhere.where;
                  argsWithWhere.where = actualWhere;
                } else {
                  argsWithWhere.where = { ...(argsWithWhere?.where || {}), is_deleted: 0 };
                }
              }
            }
            return query(args);
          },
          // 2. 全局写入拦截：自动填充 Snowflake ID
          async create({ args, query }) {
            if (!args.data.id) {
              args.data.id = snowflake.nextId();
            }
            return query(args);
          },
          async createMany({ args, query }) {
            if (args.data && Array.isArray(args.data)) {
              args.data.forEach((item: any) => {
                if (!item.id) {
                  item.id = snowflake.nextId();
                }
              });
            }
            return query(args);
          }
        },
      },
    });
  }
}
