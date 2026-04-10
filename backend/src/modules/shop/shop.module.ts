import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PrismaModule } from '../../prisma/prisma.module';
import { ProductController } from './controllers/product.controller';
import { ProductService } from './services/product.service';

@Module({
  imports: [PrismaModule, CommonModule],
  controllers: [ProductController],
  providers: [ProductService],
  exports: [ProductService]
})
export class ShopModule {}
