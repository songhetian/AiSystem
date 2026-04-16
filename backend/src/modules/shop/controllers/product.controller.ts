import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Res,
} from "@nestjs/common";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import {
  RateLimit,
  RateLimitType,
} from "../../../common/decorators/rate-limiter.decorator";
import { ProductService } from "../services/product.service";
import { Response } from "express";

@Controller("shop/products")
export class ProductController {
  constructor(private readonly productService: ProductService) {}

  @Get()
  @Permission("shop:product:list")
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  findAll(
    @CurrentUser() user: CurrentUserPayload,
    @Query() pagination: PaginationDto,
    @Query("keyword") keyword?: string,
    @Query("platform_id") platformId?: string,
    @Query("category_id") categoryId?: string,
  ) {
    return this.productService.findAll(user.sub, pagination, {
      keyword,
      platform_id: platformId,
      category_id: categoryId,
    });
  }

  @Get(":id")
  @Permission("shop:product:detail")
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  findOne(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.productService.findOne(user.sub, id);
  }

  @Post()
  @Permission("shop:product:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  create(@CurrentUser() user: CurrentUserPayload, @Body() data: any) {
    return this.productService.create(user.sub, data);
  }

  @Patch(":id")
  @Permission("shop:product:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  update(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() data: any,
  ) {
    return this.productService.update(user.sub, id, data);
  }

  @Delete(":id")
  @Permission("shop:product:delete")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  remove(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.productService.remove(user.sub, id);
  }

  @Post(":id/skus")
  @Permission("shop:product:update")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  syncSkus(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body("skus") skus: any[],
  ) {
    return this.productService.syncSkus(user.sub, id, skus);
  }

  @Post("sort")
  @Permission("shop:product:sort")
  @AntiShake(500)
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  sort(
    @CurrentUser() user: CurrentUserPayload,
    @Body("items") items: Array<{ id: string; sort: number }>,
  ) {
    return this.productService.sort(user.sub, items);
  }

  @Post("batch/status")
  @Permission("shop:product:batch-status")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  batchUpdateStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { ids: string[]; status: number },
  ) {
    return this.productService.batchUpdateStatus(user.sub, dto.ids, dto.status);
  }

  @Post("batch/category")
  @Permission("shop:product:batch-category")
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  batchUpdateCategory(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: { ids: string[]; category_id: string },
  ) {
    return this.productService.batchUpdateCategory(
      user.sub,
      dto.ids,
      dto.category_id,
    );
  }

  @Get("export")
  @Permission("shop:product:export")
  @RateLimit({ type: RateLimitType.USER, limit: 5, window: 60 })
  async exportProducts(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: { platform_id?: string; category_id?: string },
    @Res() res: Response,
  ) {
    const buffer = await this.productService.exportProducts(user.sub, query);
    res.setHeader(
      "Content-Type",
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
    );
    res.setHeader(
      "Content-Disposition",
      `attachment; filename=products_${Date.now()}.xlsx`,
    );
    res.end(buffer);
  }
}
