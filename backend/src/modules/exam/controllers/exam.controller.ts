import { Body, Controller, Get, Param, Post, Put, Query } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { CreateExamPlanDto } from '../dto/create-exam-plan.dto';
import { MarkExamAbsentDto } from '../dto/mark-exam-absent.dto';
import { QueryExamPlansDto } from '../dto/query-exam-plans.dto';
import { QueryExamResultsDto } from '../dto/query-exam-results.dto';
import { SaveExamPaperDto } from '../dto/save-exam-paper.dto';
import { SubmitExamDto } from '../dto/submit-exam.dto';
import { ExamService } from '../services/exam.service';

@Controller('exam')
export class ExamController {
  constructor(private readonly examService: ExamService) {}

  @Get('papers')
  @Permission('exam:paper:list')
  listPapers(@CurrentUser() user: CurrentUserPayload) {
    return this.examService.listPapers(user.sub);
  }

  @Get('papers/:id')
  @Permission('exam:paper:list')
  getPaper(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.examService.getPaper(user.sub, id);
  }

  @Post('papers')
  @Permission('exam:paper:create')
  createPaper(@CurrentUser() user: CurrentUserPayload, @Body() dto: SaveExamPaperDto) {
    return this.examService.createPaper(user.sub, dto);
  }

  @Put('papers/:id')
  @Permission('exam:paper:update')
  updatePaper(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: SaveExamPaperDto) {
    return this.examService.updatePaper(user.sub, id, dto);
  }

  @Get('plans')
  @Permission('exam:plan:list')
  listPlans(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryExamPlansDto) {
    return this.examService.listPlans(user.sub, query);
  }

  @Post('plans')
  @Permission('exam:plan:create')
  createPlan(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateExamPlanDto) {
    return this.examService.createPlan(user.sub, dto);
  }

  @Get('my')
  @Permission('exam:my:list')
  listMyExams(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryExamResultsDto) {
    return this.examService.listMyAssignments(user.sub, query);
  }

  @Get('my/stats')
  @Permission('exam:my:list')
  getMyExamStats(@CurrentUser() user: CurrentUserPayload) {
    return this.examService.getMyStats(user.sub);
  }

  @Get('my/active')
  @Permission('exam:my:list')
  getMyActiveExam(@CurrentUser() user: CurrentUserPayload) {
    return this.examService.getMyActiveExam(user.sub);
  }

  @Get('my/:id')
  @Permission('exam:my:list')
  getMyExamDetail(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.examService.getMyAssignmentDetail(user.sub, id);
  }

  @Post('my/:id/submit')
  @Permission('exam:my:submit')
  submitMyExam(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: SubmitExamDto) {
    return this.examService.submitAssignment(user.sub, id, dto);
  }

  @Get('results')
  @Permission('exam:result:list')
  listResults(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryExamResultsDto) {
    return this.examService.listResults(user.sub, query);
  }

  @Post('results/:id/mark-absent')
  @Permission('exam:result:manage')
  markResultAbsent(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: MarkExamAbsentDto) {
    return this.examService.markAssignmentAbsent(user.sub, id, dto);
  }

  @Get('results/summary')
  @Permission('exam:result:list')
  getResultSummary(@CurrentUser() user: CurrentUserPayload, @Query() query: QueryExamResultsDto) {
    return this.examService.getResultSummary(user.sub, query);
  }
}
