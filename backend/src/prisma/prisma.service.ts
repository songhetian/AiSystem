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

    // @ts-ignore - $use is legacy but still functional in Prisma 6
    this.$use(async (params: any, next: any) => {
      if (params.action === 'create') {
        if (params.args.data && !params.args.data.id) {
          params.args.data.id = this.snowflakeService.nextId();
        }
      }
      if (params.action === 'createMany') {
        if (params.args.data && Array.isArray(params.args.data)) {
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
