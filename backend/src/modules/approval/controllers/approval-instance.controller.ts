import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiParam,
} from '@nestjs/swagger';
import {
  CurrentUser,
  type CurrentUserPayload,
} from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { AntiShake } from '../../../common/decorators/antishake.decorator';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import {
  RateLimit,
  RateLimitType,
} from '../../../common/decorators/rate-limiter.decorator';
import { CreateApprovalInstanceDto } from '../dto/create-approval-instance.dto';
import { QueryApprovalInstancesDto } from '../dto/query-approval-instances.dto';
import { ProcessApprovalInstanceDto } from '../dto/process-approval-instance.dto';
import { ApprovalInstanceService } from '../services/approval-instance.service';

@ApiTags('审批实例管理')
@ApiBearerAuth()
@Controller('approval/instances')
export class ApprovalInstanceController {
  constructor(
    private readonly approvalInstanceService: ApprovalInstanceService,
  ) {}

  @Post()
  @ApiOperation({
    summary: '创建审批申请',
    description: '根据审批模板创建新的审批申请实例',
  })
  @ApiResponse({ status: 201, description: '审批申请创建成功' })
  @ApiResponse({ status: 400, description: '请求参数错误' })
  @ApiResponse({ status: 404, description: '审批模板不存在' })
  @Permission('approval:instance:create')
  @AntiShake(1000)
  @Idempotent({ mode: 'active', ttl: 300 })
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  createInstance(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateApprovalInstanceDto,
  ) {
    return this.approvalInstanceService.createInstance(user.sub, dto);
  }

  @Get()
  @ApiOperation({
    summary: '获取审批实例列表',
    description: '根据查询条件获取审批实例列表，支持多种视图和过滤条件',
  })
  @ApiResponse({ status: 200, description: '成功返回审批实例列表' })
  @Permission('approval:instance:list')
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  getInstanceList(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryApprovalInstancesDto,
  ) {
    return this.approvalInstanceService.getInstanceList(user.sub, query);
  }

  @Get('my')
  @ApiOperation({
    summary: '获取我的审批列表',
    description: '获取当前用户发起的所有审批申请',
  })
  @ApiResponse({ status: 200, description: '成功返回我的审批列表' })
  @Permission('approval:instance:list')
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  getMyInstances(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Omit<QueryApprovalInstancesDto, 'view'>,
  ) {
    return this.approvalInstanceService.getMyInstances(user.sub, query);
  }

  @Get('pending')
  @ApiOperation({
    summary: '获取待我审批列表',
    description: '获取分配给当前用户的待审批任务列表',
  })
  @ApiResponse({ status: 200, description: '成功返回待我审批列表' })
  @Permission('approval:instance:list')
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  getPendingInstances(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Omit<QueryApprovalInstancesDto, 'view'>,
  ) {
    return this.approvalInstanceService.getPendingInstances(user.sub, query);
  }

  @Get('completed')
  @ApiOperation({
    summary: '获取已审批列表',
    description: '获取当前用户已处理的审批任务列表',
  })
  @ApiResponse({ status: 200, description: '成功返回已审批列表' })
  @Permission('approval:instance:list')
  @RateLimit({ type: RateLimitType.USER, limit: 30, window: 60 })
  getCompletedInstances(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: Omit<QueryApprovalInstancesDto, 'view'>,
  ) {
    return this.approvalInstanceService.getCompletedInstances(user.sub, query);
  }

  @Get('stats')
  @ApiOperation({
    summary: '获取审批统计信息',
    description: '获取当前用户的审批相关统计数据',
  })
  @ApiResponse({ status: 200, description: '成功返回审批统计信息' })
  @Permission('approval:instance:list')
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  getInstanceStats(@CurrentUser() user: CurrentUserPayload) {
    return this.approvalInstanceService.getInstanceStats(user.sub);
  }

  @Get(':id')
  @ApiOperation({
    summary: '获取审批详情',
    description: '根据ID获取审批实例的详细信息，包括审批记录和流程状态',
  })
  @ApiParam({
    name: 'id',
    description: '审批实例ID',
    example: 'instance-123',
  })
  @ApiResponse({ status: 200, description: '成功返回审批详情' })
  @ApiResponse({ status: 404, description: '审批实例不存在' })
  @ApiResponse({ status: 403, description: '无权限查看此审批实例' })
  @Permission('approval:instance:detail')
  @RateLimit({ type: RateLimitType.USER, limit: 50, window: 60 })
  getInstanceDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.approvalInstanceService.getInstanceDetail(user.sub, id);
  }

  @Post(':id/process')
  @ApiOperation({
    summary: '处理审批任务',
    description: '对审批实例执行审批操作（同意、驳回、转审、委托）',
  })
  @ApiParam({
    name: 'id',
    description: '审批实例ID',
    example: 'instance-123',
  })
  @ApiResponse({ status: 200, description: '审批操作执行成功' })
  @ApiResponse({ status: 400, description: '请求参数错误或实例状态不允许操作' })
  @ApiResponse({ status: 403, description: '无权限处理此审批任务' })
  @ApiResponse({ status: 404, description: '审批实例不存在' })
  @Permission('approval:instance:process')
  @AntiShake(1000)
  @Idempotent({ mode: 'active', ttl: 300 })
  @RateLimit({ type: RateLimitType.USER, limit: 20, window: 60 })
  processInstance(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Body() dto: ProcessApprovalInstanceDto,
  ) {
    return this.approvalInstanceService.processInstance(user.sub, id, dto);
  }

  @Patch(':id/cancel')
  @ApiOperation({
    summary: '取消审批申请',
    description: '申请人取消自己发起的审批申请（仅限待审批状态）',
  })
  @ApiParam({
    name: 'id',
    description: '审批实例ID',
    example: 'instance-123',
  })
  @ApiResponse({ status: 200, description: '审批申请取消成功' })
  @ApiResponse({ status: 400, description: '审批状态不允许取消' })
  @ApiResponse({ status: 403, description: '只有申请人可以取消审批申请' })
  @ApiResponse({ status: 404, description: '审批实例不存在' })
  @Permission('approval:instance:cancel')
  @AntiShake(1000)
  @RateLimit({ type: RateLimitType.USER, limit: 10, window: 60 })
  cancelInstance(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
  ) {
    return this.approvalInstanceService.cancelInstance(user.sub, id);
  }
}
