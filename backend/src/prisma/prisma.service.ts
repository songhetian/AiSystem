import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { SnowflakeService } from '../common/utils/snowflake.util';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit {
  constructor(private snowflakeService: SnowflakeService) {
    super();
  }

  async onModuleInit() {
    await this.$connect();

    // 真正的全局拦截：使用 Prisma Middleware
    // 这种方式兼容性最好，能确保所有模块的 .create() 都会被处理
    this.$use(async (params, next) => {
      if (params.action === 'create') {
        if (!params.args.data.id) {
          params.args.data.id = this.snowflakeService.nextId();
        }
      }
      if (params.action === 'createMany') {
        if (Array.isArray(params.args.data)) {
          params.args.data.forEach((item: any) => {
            if (!item.id) {
              item.id = this.snowflakeService.nextId();
            }
          });
        }
      }
      return next(params);
    });
  }
}
 target._extendedClient) {
          return target._extendedClient[prop];
        }
        return (target as any)[prop];
      },
    });
  }

  /**
   * 手动注入 SnowflakeService 引用，供代理使用
   */
  private get snowflake() {
    return this.snowflakeService;
  }

  // 这里的代理逻辑在 NestJS 依赖注入中比较复杂，我们采取更稳妥的拦截方式：
  // 覆写原始的 create 逻辑是不可能的（Prisma 内部保护），
  // 因此我们通过 Middleware 这一更兼容的方式
}
