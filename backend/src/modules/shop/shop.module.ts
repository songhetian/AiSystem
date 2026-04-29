import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductController } from './controllers/product.controller';
import { ActivityController } from './controllers/activity.controller';
import { ProductService } from './services/product.service';
import { ActivityService } from './services/activity.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ProductController, ActivityController],
  providers: [ProductService, ActivityService],
  exports: [ProductService, ActivityService]
})
export class ShopModule {}
