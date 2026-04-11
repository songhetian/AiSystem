import { Global, Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';
import { SnowflakeService } from '../common/utils/snowflake.util';

@Global()
@Module({
  providers: [PrismaService, SnowflakeService],
  exports: [PrismaService]
})
export class PrismaModule {}
