import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { ProductService } from '../services/product.service';

@Controller('shop/products')
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @Permission('shop:product:list')
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: { keyword?: string; platform_id?: string; category_id?: string }
  ) {
    return this.productService.findAll(user.sub, query);
  }

  @Post()
  @Permission('shop:product:create')
  create(@CurrentUser() user: CurrentUserPayload, @Body() data: any) {
    return this.productService.create(user.sub, data);
  }

  @Patch(':id')
  @Permission('shop:product:update')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() data: any) {
    return this.productService.update(user.sub, id, data);
  }

  @Delete(':id')
  @Permission('shop:product:delete')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.productService.remove(user.sub, id);
  }

  @Post(':id/skus')
  @Permission('shop:product:update')
  syncSkus(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body('skus') skus: any[]) {
    return this.productService.syncSkus(user.sub, id, skus);
  }
}
