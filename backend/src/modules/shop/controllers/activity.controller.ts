import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { ActivityService } from '../services/activity.service';
import { CreateActivityDto } from '../dto/create-activity.dto';
import { UpdateActivityDto } from '../dto/update-activity.dto';
import { QueryActivityDto } from '../dto/query-activity.dto';

@ApiTags('商城活动管理')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('shop/activities')
export class ActivityController {
  constructor(private readonly activityService: ActivityService) {}

  @Post()
  @ApiOperation({ summary: '创建活动' })
  @ApiResponse({ status: 201, description: '创建成功' })
  async create(@Request() req, @Body() createDto: CreateActivityDto) {
    return this.activityService.create(req.user.userId, createDto);
  }

  @Get()
  @ApiOperation({ summary: '查询活动列表' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findAll(@Query() query: QueryActivityDto) {
    return this.activityService.findAll(query);
  }

  @Get('statistics')
  @ApiOperation({ summary: '获取活动统计' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async getStatistics(
    @Query('platform_id') platform_id?: string,
    @Query('dept_id') dept_id?: string,
    @Query('shop_id') shop_id?: string,
  ) {
    return this.activityService.getStatistics({ platform_id, dept_id, shop_id });
  }

  @Get(':id')
  @ApiOperation({ summary: '查询活动详情' })
  @ApiResponse({ status: 200, description: '查询成功' })
  async findOne(@Param('id') id: string) {
    return this.activityService.findOne(id);
  }

  @Put(':id')
  @ApiOperation({ summary: '更新活动' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async update(
    @Param('id') id: string,
    @Request() req,
    @Body() updateDto: UpdateActivityDto,
  ) {
    return this.activityService.update(id, req.user.userId, updateDto);
  }

  @Put(':id/status')
  @ApiOperation({ summary: '更新活动状态' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateStatus(
    @Param('id') id: string,
    @Request() req,
    @Body('status') status: number,
  ) {
    return this.activityService.updateStatus(id, req.user.userId, status);
  }

  @Put(':id/rules/sort')
  @ApiOperation({ summary: '更新规则排序' })
  @ApiResponse({ status: 200, description: '更新成功' })
  async updateRuleSort(
    @Param('id') id: string,
    @Request() req,
    @Body('ruleIds') ruleIds: string[],
  ) {
    return this.activityService.updateRuleSort(id, req.user.userId, ruleIds);
  }

  @Delete(':id')
  @ApiOperation({ summary: '删除活动' })
  @ApiResponse({ status: 200, description: '删除成功' })
  async remove(@Param('id') id: string, @Request() req) {
    return this.activityService.remove(id, req.user.userId);
  }
}
