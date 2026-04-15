import { Controller, Post, Body, Get, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { AiScheduleService } from '../services/ai-schedule.service';
import { GenerateAIScheduleDto } from '../dto/ai-schedule.dto';
import { Idempotent } from '../../../common/decorators/idempotent.decorator';
import { DistributedLock } from '../../../common/decorators/distributed-lock.decorator';
// V4.0 新增服务导入
import { ScheduleAsyncService } from '../services/schedule-async.service';
import { ScheduleIncrementalService } from '../services/schedule-incremental.service';
import { ScheduleRecommendationService } from '../services/schedule-recommendation.service';
import { ScheduleMlService } from '../services/schedule-ml.service';
import { ScheduleMultiObjectiveService } from '../services/schedule-multi-objective.service';
import { ScheduleRealtimeService } from '../services/schedule-realtime.service';

@Controller('attendance/ai-schedule')
export class AiScheduleController {
  constructor(
    private readonly aiScheduleService: AiScheduleService,
    // V4.0 新增服务
    private readonly scheduleAsyncService: ScheduleAsyncService,
    private readonly scheduleIncrementalService: ScheduleIncrementalService,
    private readonly scheduleRecommendationService: ScheduleRecommendationService,
    private readonly scheduleMlService: ScheduleMlService,
    private readonly scheduleMultiObjectiveService: ScheduleMultiObjectiveService,
    private readonly scheduleRealtimeService: ScheduleRealtimeService,
  ) {}

  @Post('generate')
  @Permission('attendance:ai-schedule:generate')
  @Idempotent({ mode: 'active', ttl: 3600 })
  @DistributedLock({ key: 'ai-schedule:generate:{body.dept_id}', ttl: 600 })
  generateDrafts(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: GenerateAIScheduleDto
  ) {
    return this.aiScheduleService.generateDrafts(user.sub, dto);
  }

  @Post('apply')
  @Permission('attendance:ai-schedule:apply')
  applyDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Body('draftData') draftData: any[],
    @Body('historyMeta') historyMeta?: any,
  ) {
    return this.aiScheduleService.applyDraft(user.sub, draftData, historyMeta);
  }

  @Get('history')
  @Permission('attendance:ai-schedule:generate')
  getHistory(@CurrentUser() user: CurrentUserPayload) {
    return this.aiScheduleService.getHistory(user.sub);
  }

  @Get('analytics')
  @Permission('attendance:ai-schedule:generate')
  getAnalytics(
    @CurrentUser() user: CurrentUserPayload,
    @Query('dept_id') deptId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.aiScheduleService.getAnalytics(user.sub, deptId, startDate, endDate);
  }
  @Post('auto-optimize')
  @Permission('attendance:ai-schedule:generate')
  autoOptimizeDraft(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { draftData: any[]; config: GenerateAIScheduleDto }
  ) {
    return this.aiScheduleService.autoOptimizeDraft(user.sub, body.draftData, body.config);
  }

  @Post('replacement-candidates')
  @Permission('attendance:ai-schedule:generate')
  getReplacementCandidates(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { date: string; shiftName: string; draftData: any[]; config: GenerateAIScheduleDto }
  ) {
    return this.aiScheduleService.getReplacementCandidates(user.sub, body.date, body.shiftName, body.draftData, body.config);
  }

  @Post('staffing-demands')
  @Permission('attendance:ai-schedule:generate')
  saveStaffingDemands(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { dept_id: string; demands: any[] }
  ) {
    return this.aiScheduleService.saveStaffingDemands(user.sub, body.dept_id, body.demands);
  }

  @Post('publish')
  @Permission('attendance:ai-schedule:apply')
  @Idempotent({ mode: 'active', ttl: 600 })
  @DistributedLock({ key: 'ai-schedule:publish:{body.dept_id}', ttl: 120 })
  publishSchedules(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { dept_id: string; start_date: string; end_date: string }
  ) {
    return this.aiScheduleService.publishSchedules(user.sub, body.dept_id, body.start_date, body.end_date);
  }

  @Get('my')
  @Permission('attendance:ai-schedule:generate')
  getMySchedules(
    @CurrentUser() user: CurrentUserPayload,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.aiScheduleService.getMySchedules(user.sub, startDate, endDate);
  }

  @Post('swap-request')
  @Permission('attendance:ai-schedule:generate')
  submitSwapRequest(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { date: string; before_shift: string; after_shift: string; reason: string }
  ) {
    return this.aiScheduleService.submitSwapRequest(user.sub, body);
  }

  @Get('pending-swaps')
  @Permission('attendance:ai-schedule:generate')
  getPendingSwaps(
    @CurrentUser() user: CurrentUserPayload,
    @Query('dept_id') deptId: string
  ) {
    return this.aiScheduleService.getPendingSwaps(user.sub, deptId);
  }

  /**
   * 生成排班预测（V3.0 新增）
   */
  @Post('predictions/generate')
  @Permission('attendance:ai-schedule:generate')
  @Idempotent({ mode: 'active', ttl: 1800 })
  generatePredictions(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: { dept_id: string; start_date: string; end_date: string }
  ) {
    return this.aiScheduleService.generatePredictions(user.sub, body.dept_id, body.start_date, body.end_date);
  }

  /**
   * 获取排班预测（V3.0 新增）
   */
  @Get('predictions')
  @Permission('attendance:ai-schedule:generate')
  getPredictions(
    @CurrentUser() user: CurrentUserPayload,
    @Query('dept_id') deptId: string,
    @Query('start_date') startDate: string,
    @Query('end_date') endDate: string,
  ) {
    return this.aiScheduleService.getPredictions(user.sub, deptId, startDate, endDate);
  }

  /**
   * 获取排班历史详情（V3.0 新增）
   */
  @Get('history/:id')
  @Permission('attendance:ai-schedule:generate')
  getHistoryDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Query('id') historyId: string
  ) {
    return this.aiScheduleService.getHistoryDetail(user.sub, historyId);
  }

  /**
   * 提交异步排班任务（V4.0 新增）
   */
  @Post('async/submit')
  @Permission('attendance:ai-schedule:generate')
  @Idempotent({ mode: 'active', ttl: 3600 })
  submitAsyncScheduleJob(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: GenerateAIScheduleDto
  ) {
    return this.scheduleAsyncService.submitScheduleJob(user.sub, dto);
  }

  /**
   * 获取异步任务状态（V4.0 新增）
   */
  @Get('async/status/:jobId')
  @Permission('attendance:ai-schedule:generate')
  getAsyncJobStatus(
    @CurrentUser() user: CurrentUserPayload,
    @Query('jobId') jobId: string
  ) {
    return this.scheduleAsyncService.getJobStatus(jobId);
  }

  /**
   * 取消异步任务（V4.0 新增）
   */
  @Post('async/cancel/:jobId')
  @Permission('attendance:ai-schedule:generate')
  cancelAsyncJob(
    @CurrentUser() user: CurrentUserPayload,
    @Query('jobId') jobId: string
  ) {
    return this.scheduleAsyncService.cancelJob(jobId);
  }

  /**
   * 获取用户的所有异步任务（V4.0 新增）
   */
  @Get('async/my-jobs')
  @Permission('attendance:ai-schedule:generate')
  getMyAsyncJobs(
    @CurrentUser() user: CurrentUserPayload,
    @Query('limit') limit?: number
  ) {
    return this.scheduleAsyncService.getUserJobs(user.sub, limit);
  }

  /**
   * 增量更新排班（V4.0 新增）
   */
  @Post('incremental/update')
  @Permission('attendance:ai-schedule:apply')
  incrementalUpdate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      employee_id: string;
      date: string;
      shift_name: string;
      config: any;
    }
  ) {
    return this.scheduleIncrementalService.updateEmployeeSchedule(
      user.sub,
      body.employee_id,
      body.date,
      body.shift_name,
      body.config
    );
  }

  /**
   * 批量增量更新（V4.0 新增）
   */
  @Post('incremental/batch-update')
  @Permission('attendance:ai-schedule:apply')
  batchIncrementalUpdate(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      updates: Array<{ employee_id: string; date: string; shift_name: string }>;
      config: any;
    }
  ) {
    return this.scheduleIncrementalService.batchUpdateSchedules(
      user.sub,
      body.updates,
      body.config
    );
  }

  /**
   * 智能补班（V4.0 新增）
   */
  @Post('incremental/auto-fill')
  @Permission('attendance:ai-schedule:apply')
  autoFillGaps(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      dept_id: string;
      start_date: string;
      end_date: string;
      config: any;
    }
  ) {
    return this.scheduleIncrementalService.autoFillGaps(
      user.sub,
      body.dept_id,
      body.start_date,
      body.end_date,
      body.config
    );
  }

  /**
   * 生成AI推荐（V4.0 新增）
   */
  @Post('recommendations/generate')
  @Permission('attendance:ai-schedule:generate')
  @Idempotent({ mode: 'active', ttl: 1800 })
  generateRecommendations(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      platform_id: string;
      dept_id: string;
      start_date: string;
      end_date: string;
    }
  ) {
    return this.scheduleRecommendationService.generateRecommendations(
      body.platform_id,
      body.dept_id,
      body.start_date,
      body.end_date
    );
  }

  /**
   * 自动优化配置（V4.0 新增）
   */
  @Post('recommendations/auto-optimize')
  @Permission('attendance:ai-schedule:generate')
  autoOptimizeConfig(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      platform_id: string;
      dept_id: string;
      current_config: any;
    }
  ) {
    return this.scheduleRecommendationService.autoOptimizeConfig(
      body.platform_id,
      body.dept_id,
      body.current_config
    );
  }

  /**
   * ML预测人力需求（V4.0 新增）
   */
  @Post('ml/predict')
  @Permission('attendance:ai-schedule:generate')
  mlPredictDemand(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      platform_id: string;
      dept_id: string;
      shift_name: string;
      predict_date: string;
    }
  ) {
    return this.scheduleMlService.predictDemand(
      body.platform_id,
      body.dept_id,
      body.shift_name,
      body.predict_date
    );
  }

  /**
   * ML批量预测（V4.0 新增）
   */
  @Post('ml/batch-predict')
  @Permission('attendance:ai-schedule:generate')
  mlBatchPredict(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      platform_id: string;
      dept_id: string;
      start_date: string;
      end_date: string;
    }
  ) {
    return this.scheduleMlService.batchPredict(
      body.platform_id,
      body.dept_id,
      body.start_date,
      body.end_date
    );
  }

  /**
   * 训练ML模型（V4.0 新增）
   */
  @Post('ml/train')
  @Permission('attendance:ai-schedule:generate')
  trainMlModel(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      platform_id: string;
      dept_id: string;
      shift_name: string;
    }
  ) {
    return this.scheduleMlService.trainModel(
      body.platform_id,
      body.dept_id,
      body.shift_name
    );
  }

  /**
   * 评估ML模型（V4.0 新增）
   */
  @Get('ml/evaluate')
  @Permission('attendance:ai-schedule:generate')
  evaluateMlModel(
    @CurrentUser() user: CurrentUserPayload,
    @Query('platform_id') platformId: string,
    @Query('dept_id') deptId: string,
    @Query('shift_name') shiftName: string
  ) {
    return this.scheduleMlService.evaluateModel(platformId, deptId, shiftName);
  }

  /**
   * 多目标优化（V4.0 新增）
   */
  @Post('multi-objective/optimize')
  @Permission('attendance:ai-schedule:generate')
  @Idempotent({ mode: 'active', ttl: 3600 })
  multiObjectiveOptimize(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      dept_id: string;
      start_date: string;
      end_date: string;
      config: any;
    }
  ) {
    return this.scheduleMultiObjectiveService.optimizeMultiObjective(
      user.sub,
      body.dept_id,
      body.start_date,
      body.end_date,
      body.config
    );
  }

  /**
   * 监控今日排班（V4.0 新增）
   */
  @Get('realtime/monitor')
  @Permission('attendance:ai-schedule:generate')
  monitorTodaySchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Query('platform_id') platformId: string,
    @Query('dept_id') deptId: string
  ) {
    return this.scheduleRealtimeService.monitorTodaySchedule(platformId, deptId);
  }

  /**
   * 自动调整未来排班（V4.0 新增）
   */
  @Post('realtime/auto-adjust')
  @Permission('attendance:ai-schedule:apply')
  autoAdjustFutureSchedule(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      platform_id: string;
      dept_id: string;
      reason: string;
    }
  ) {
    return this.scheduleRealtimeService.autoAdjustFutureSchedule(
      user.sub,
      body.platform_id,
      body.dept_id,
      body.reason
    );
  }

  /**
   * 智能补班建议（V4.0 新增）
   */
  @Post('realtime/suggest-replacement')
  @Permission('attendance:ai-schedule:generate')
  suggestReplacement(
    @CurrentUser() user: CurrentUserPayload,
    @Body() body: {
      platform_id: string;
      dept_id: string;
      absent_employee_id: string;
      date: string;
      shift_name: string;
    }
  ) {
    return this.scheduleRealtimeService.suggestReplacement(
      body.platform_id,
      body.dept_id,
      body.absent_employee_id,
      body.date,
      body.shift_name
    );
  }
}
