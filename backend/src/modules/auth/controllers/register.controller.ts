import { Body, Controller, Get, Param, Post, Query, Req } from "@nestjs/common";
import { Public } from "../../../common/public.decorator";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import {
  RateLimit,
  RateLimitType,
} from "../../../common/decorators/rate-limiter.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";
import { Permission } from "../../../common/permission.decorator";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { PaginationDto } from "../../../common/dto/pagination.dto";
import { RegisterDto, CheckPhoneDto } from "../dto/register.dto";
import {
  ApproveRegisterDto,
  BatchApproveRegisterDto,
} from "../dto/approve-register.dto";
import { RegisterService } from "../services/register.service";

/**
 * 注册控制器（V2.0 高可用优化）
 * 包含用户注册、图形验证码、管理员审核等功能
 */
@Controller("auth/register")
export class RegisterController {
  constructor(private readonly registerService: RegisterService) {}

  /**
   * 生成注册图形验证码（公开接口）
   * 优化点：限流保护（60秒内最多10次）
   */
  @Public()
  @Get("captcha")
  @RateLimit({ type: RateLimitType.IP, limit: 10, window: 60 })
  generateCaptcha() {
    return this.registerService.generateCaptcha();
  }

  /**
   * 检查手机号是否已注册（公开接口）
   * 优化点：缓存优化（5分钟）、IP级限流
   */
  @Public()
  @Post("check-phone")
  @Cache({ ttl: 300, prefix: "check-phone" })
  @RateLimit({ type: RateLimitType.IP, limit: 10, window: 60 })
  checkPhone(@Body() dto: CheckPhoneDto) {
    return this.registerService.checkPhone(dto.phone);
  }

  /**
   * 用户注册（公开接口）
   * 优化点：防抖保护（2秒）、幂等控制（5分钟）、IP级限流
   */
  @Public()
  @Post()
  @AntiShake(2000)
  @Idempotent({ window: 300, keyFields: ["phone"] })
  @RateLimit({ type: RateLimitType.IP, limit: 5, window: 300 })
  register(@Body() dto: RegisterDto) {
    return this.registerService.register(dto);
  }

  /**
   * 获取注册申请列表（管理员）
   * 优化点：缓存优化（5分钟）、慢查询监控、限流保护
   */
  @Get("list")
  @Permission("system:register:list")
  @Cache({ ttl: 300, byUser: true, prefix: "register-list" })
  @QueryOptimize({ timeout: 5000, slowQueryThreshold: 300 })
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  getRegisterList(
    @Query() pagination: PaginationDto,
    @Query("status") status?: string,
    @Query("keyword") keyword?: string,
    @Query("deptId") deptId?: string,
  ) {
    return this.registerService.getRegisterList(pagination, {
      status,
      keyword,
      deptId,
    });
  }

  /**
   * 获取注册申请详情（管理员）
   * 优化点：缓存优化（5分钟）、限流保护
   */
  @Get(":id")
  @Permission("system:register:detail")
  @Cache({ ttl: 300, byUser: true, prefix: "register-detail" })
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  getRegisterDetail(@Param("id") id: string) {
    return this.registerService.getRegisterDetail(id);
  }

  /**
   * 审核注册申请（管理员）
   * 优化点：防抖保护（1秒）、幂等控制（5分钟）、清除缓存、限流保护
   */
  @Post("approve")
  @Permission("system:register:approve")
  @AntiShake(1000)
  @Idempotent({ window: 300, keyFields: ["id", "status"] })
  @CacheEvict({ pattern: "cache:register-*,cache:user-*" })
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  approveRegister(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: ApproveRegisterDto,
  ) {
    return this.registerService.approveRegister(dto, user.sub);
  }

  /**
   * 批量审核注册申请（管理员）
   * 优化点：防抖保护（1秒）、幂等控制（5分钟）、清除缓存、限流保护
   */
  @Post("batch-approve")
  @Permission("system:register:batch-approve")
  @AntiShake(1000)
  @Idempotent({ window: 300, keyFields: ["ids", "status"] })
  @CacheEvict({ pattern: "cache:register-*,cache:user-*" })
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  batchApproveRegister(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: BatchApproveRegisterDto,
  ) {
    return this.registerService.batchApproveRegister(dto, user.sub);
  }
}
