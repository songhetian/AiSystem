import { Body, Controller, Get, Param, Post, Put, Query } from "@nestjs/common";
import {
  CurrentUser,
  type CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { Permission } from "../../../common/permission.decorator";
import { CreateExamPlanDto } from "../dto/create-exam-plan.dto";
import { MarkExamAbsentDto } from "../dto/mark-exam-absent.dto";
import { QueryExamPlansDto } from "../dto/query-exam-plans.dto";
import { QueryExamResultsDto } from "../dto/query-exam-results.dto";
import { SaveExamPaperDto } from "../dto/save-exam-paper.dto";
import { SubmitExamDto } from "../dto/submit-exam.dto";
import { ManualGradeDto } from "../dto/manual-grade.dto";
import { ExamService } from "../services/exam.service";
import { AntiShake } from "../../../common/decorators/antishake.decorator";
import { Idempotent } from "../../../common/decorators/idempotent.decorator";
import { RateLimit } from "../../../common/decorators/rate-limiter.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Controller("exam")
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Get("papers")
  @Permission("exam:paper:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "exam:papers", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  listPapers(@CurrentUser() user: CurrentUserPayload) {
    return this.examService.listPapers(user.sub);
  }

  @Get("papers/:id")
  @Permission("exam:paper:list")
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: "exam:paper:detail", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  getPaper(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.examService.getPaper(user.sub, id);
  }

  @Post("papers")
  @Permission("exam:paper:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["exam:papers:*"] })
  createPaper(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: SaveExamPaperDto,
  ) {
    return this.examService.createPaper(user.sub, dto);
  }

  @Put("papers/:id")
  @Permission("exam:paper:update")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["exam:papers:*"] })
  updatePaper(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: SaveExamPaperDto,
  ) {
    return this.examService.updatePaper(user.sub, id, dto);
  }

  @Get("plans")
  @Permission("exam:plan:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "exam:plans", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  listPlans(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryExamPlansDto,
  ) {
    return this.examService.listPlans(user.sub, query);
  }

  @Get("plans/:id")
  @Permission("exam:plan:list")
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: "exam:plan:detail", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  getPlanDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.examService.getPlanDetail(user.sub, id);
  }

  @Get("plans/:id/score-distribution")
  @Permission("exam:plan:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "exam:plan:score-distribution", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  getPlanScoreDistribution(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.examService.getPlanScoreDistribution(user.sub, id);
  }

  @Get("plans/:id/dept-comparison")
  @Permission("exam:plan:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "exam:plan:dept-comparison", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  getDeptComparison(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.examService.getDeptComparison(user.sub, id);
  }

  @Post("plans")
  @Permission("exam:plan:create")
  @AntiShake(1000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["exam:plans:*", "exam:my:*"] })
  createPlan(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: CreateExamPlanDto,
  ) {
    return this.examService.createPlan(user.sub, dto);
  }

  @Get("my")
  @Permission("exam:my:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "exam:my:list", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  listMyExams(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryExamResultsDto,
  ) {
    return this.examService.listMyAssignments(user.sub, query);
  }

  @Get("my/stats")
  @Permission("exam:my:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "exam:my:stats", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  getMyExamStats(@CurrentUser() user: CurrentUserPayload) {
    return this.examService.getMyStats(user.sub);
  }

  @Get("my/active")
  @Permission("exam:my:list")
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: "exam:my:active", ttl: 60 })
  getMyActiveExam(@CurrentUser() user: CurrentUserPayload) {
    return this.examService.getMyActiveExam(user.sub);
  }

  @Get("my/:id")
  @Permission("exam:my:list")
  @RateLimit({ limit: 50, window: 60 })
  @Cache({ key: "exam:my:detail", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 200, timeout: 3000 })
  getMyExamDetail(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.examService.getMyAssignmentDetail(user.sub, id);
  }

  @Post("my/:id/submit")
  @Permission("exam:my:submit")
  @AntiShake(2000)
  @Idempotent({ mode: "active", ttl: 300 })
  @RateLimit({ limit: 10, window: 60 })
  @CacheEvict({ keys: ["exam:my:*", "exam:results:*"] })
  submitMyExam(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: SubmitExamDto,
  ) {
    return this.examService.submitAssignment(user.sub, id, dto);
  }

  @Get("results")
  @Permission("exam:result:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "exam:results", ttl: 300 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  listResults(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryExamResultsDto,
  ) {
    return this.examService.listResults(user.sub, query);
  }

  @Post("results/:id/mark-absent")
  @Permission("exam:result:manage")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["exam:results:*", "exam:my:*"] })
  markResultAbsent(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: MarkExamAbsentDto,
  ) {
    return this.examService.markAssignmentAbsent(user.sub, id, dto);
  }

  @Post("results/:id/manual-grade")
  @Permission("exam:result:manage")
  @AntiShake(1000)
  @RateLimit({ limit: 20, window: 60 })
  @CacheEvict({ keys: ["exam:results:*", "exam:my:*"] })
  manualGradeResult(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
    @Body() dto: ManualGradeDto,
  ) {
    return this.examService.manualGradeAssignment(user.sub, id, dto);
  }

  @Get("results/summary")
  @Permission("exam:result:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "exam:results:summary", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  getResultSummary(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryExamResultsDto,
  ) {
    return this.examService.getResultSummary(user.sub, query);
  }

  @Get("results/question-stats/:planId")
  @Permission("exam:result:list")
  @RateLimit({ limit: 30, window: 60 })
  @Cache({ key: "exam:results:question-stats", ttl: 600 })
  @QueryOptimize({ slowQueryThreshold: 300, timeout: 5000 })
  getQuestionStats(
    @CurrentUser() user: CurrentUserPayload,
    @Param("planId") planId: string,
  ) {
    return this.examService.getQuestionItemStats(user.sub, planId);
  }

  @Post("results/batch-absent")
  @Permission("exam:result:manage")
  @AntiShake(1000)
  @RateLimit({ limit: 5, window: 60 })
  @CacheEvict({ keys: ["exam:results:*", "exam:my:*"] })
  batchMarkAbsent(
    @CurrentUser() user: CurrentUserPayload,
    @Body()
    body: {
      plan_id: string;
      items: Array<{ employee_id?: string; user_id?: string; reason?: string }>;
    },
  ) {
    return this.examService.batchMarkAbsent(user.sub, body.plan_id, body.items);
  }

  @Get("results/export")
  @Permission("exam:result:list")
  @RateLimit({ limit: 5, window: 60 })
  exportResults(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QueryExamResultsDto,
  ) {
    return this.examService.exportResults(user.sub, query);
  }
}
