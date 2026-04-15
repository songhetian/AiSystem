import {
  ForbiddenException,
  Injectable,
  Logger,
  NotFoundException,
} from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";
import { Prisma } from "@prisma/client";
import { MessageService } from "../../../common/services/message.service";
import { ScopeService } from "../../../common/services/scope.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { CreateExamPlanDto } from "../dto/create-exam-plan.dto";
import { MarkExamAbsentDto } from "../dto/mark-exam-absent.dto";
import { QueryExamPlansDto } from "../dto/query-exam-plans.dto";
import { QueryExamResultsDto } from "../dto/query-exam-results.dto";
import { SaveExamPaperDto } from "../dto/save-exam-paper.dto";
import { SubmitExamDto } from "../dto/submit-exam.dto";
import { ManualGradeDto } from "../dto/manual-grade.dto";
import { Cacheable } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

type JsonValue = Prisma.InputJsonValue | Prisma.JsonValue;

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly messageService: MessageService,
    @InjectQueue("exam-queue") private readonly examQueue: Queue,
  ) {}

  private examPaperDelegate() {
    return (this.prisma as any).exam_paper;
  }

  private examPlanDelegate() {
    return (this.prisma as any).exam_plan;
  }

  private examAssignmentDelegate() {
    return (this.prisma as any).exam_assignment;
  }

  @Cacheable({
    prefix: "exam:papers",
    ttl: 600, // 10分钟
    keyGenerator: (_userId: string) => "all",
  })
  @QueryOptimize()
  async listPapers(_userId: string) {
    // ✅ 优化：使用include预加载题目数量，避免N+1问题
    const papers =
      (await this.examPaperDelegate().findMany?.({
        where: { is_deleted: 0 },
        include: {
          _count: {
            select: { questions: { where: { is_deleted: 0 } } },
          },
        },
        orderBy: { update_time: "desc" },
      })) ?? [];

    // 转换数据格式
    return papers.map((paper: any) => ({
      ...paper,
      question_count: paper._count?.questions || 0,
    }));
  }

  @Cacheable({
    prefix: "exam:paper",
    ttl: 600, // 10分钟
    keyGenerator: (_userId: string, id: string) => id,
  })
  @QueryOptimize()
  async getPaper(_userId: string, id: string) {
    // ✅ 优化：预加载题目，避免N+1问题
    const paper = await this.examPaperDelegate().findUnique?.({
      where: { id },
      include: {
        questions: {
          where: { is_deleted: 0 },
          orderBy: { sort: "asc" },
        },
      },
    });

    if (!paper) throw new NotFoundException("试卷不存在");
    return paper;
  }

  @CacheEvict({
    prefix: ["exam:papers", "exam:paper"],
    pattern: "*",
  })
  async createPaper(userId: string, dto: SaveExamPaperDto) {
    await this.scopeService.resolveAccess(userId);
    return this.examPaperDelegate().create?.({ data: dto }) ?? dto;
  }

  @CacheEvict({
    prefix: ["exam:papers", "exam:paper"],
    pattern: "*",
  })
  async updatePaper(userId: string, id: string, dto: SaveExamPaperDto) {
    await this.scopeService.resolveAccess(userId);
    return (
      this.examPaperDelegate().update?.({ where: { id }, data: dto }) ?? {
        id,
        ...dto,
      }
    );
  }

  @Cacheable({
    prefix: "exam:plans",
    ttl: 300, // 5分钟
    keyGenerator: (_userId: string, query: QueryExamPlansDto) =>
      query.keyword || "all",
  })
  @QueryOptimize()
  async listPlans(_userId: string, query: QueryExamPlansDto) {
    // ✅ 优化：预加载试卷信息和统计数据，避免N+1问题
    const plans =
      (await this.examPlanDelegate().findMany?.({
        where: {
          is_deleted: 0,
          ...(query.keyword ? { plan_name: { contains: query.keyword } } : {}),
        },
        include: {
          paper: {
            select: {
              id: true,
              paper_name: true,
              total_score: true,
              pass_score: true,
            },
          },
          _count: {
            select: {
              assignments: true,
            },
          },
        },
        orderBy: { update_time: "desc" },
      })) ?? [];

    // 批量查询统计数据，避免N+1问题
    const planIds = plans.map((p: any) => p.id);
    const statsData = await this.batchGetPlanStats(planIds);

    return plans.map((plan: any) => ({
      ...plan,
      total_count: plan._count?.assignments || 0,
      ...statsData[plan.id],
    }));
  }

  /**
   * 批量获取考试计划统计数据
   */
  private async batchGetPlanStats(planIds: string[]) {
    if (planIds.length === 0) return {};

    const assignments =
      (await this.examAssignmentDelegate().findMany?.({
        where: {
          plan_id: { in: planIds },
          is_deleted: 0,
        },
        select: {
          plan_id: true,
          status: true,
          passed: true,
        },
      })) ?? [];

    const stats: Record<string, any> = {};

    for (const planId of planIds) {
      const planAssignments = assignments.filter(
        (a: any) => a.plan_id === planId,
      );
      stats[planId] = {
        submitted_count: planAssignments.filter(
          (a: any) => a.status === "submitted",
        ).length,
        passed_count: planAssignments.filter((a: any) => a.passed === 1).length,
        absent_count: planAssignments.filter((a: any) => a.status === "absent")
          .length,
        pending_count: planAssignments.filter(
          (a: any) => a.status === "pending",
        ).length,
      };
    }

    return stats;
  }

  @CacheEvict({
    prefix: "exam:plans",
    pattern: "*",
  })
  async createPlan(userId: string, dto: CreateExamPlanDto) {
    await this.scopeService.resolveAccess(userId);
    return this.examPlanDelegate().create?.({ data: dto }) ?? dto;
  }

  /**
   * 获取考试计划详情（包含统计数据）
   */
  @Cacheable({
    prefix: "exam:plan:detail",
    ttl: 180, // 3分钟
    keyGenerator: (_userId: string, id: string) => id,
  })
  @QueryOptimize()
  async getPlanDetail(_userId: string, id: string) {
    const plan = await this.examPlanDelegate().findUnique?.({
      where: { id },
      include: {
        paper: {
          include: {
            questions: {
              where: { is_deleted: 0 },
              orderBy: { sort: "asc" },
            },
          },
        },
      },
    });

    if (!plan) throw new NotFoundException("考试计划不存在");

    // 获取统计数据
    const assignments =
      (await this.examAssignmentDelegate().findMany?.({
        where: { plan_id: id, is_deleted: 0 },
        select: {
          id: true,
          status: true,
          score: true,
          passed: true,
          employee_name: true,
          submitted_at: true,
        },
      })) ?? [];

    const stats = {
      total_count: assignments.length,
      submitted_count: assignments.filter((a: any) => a.status === "submitted")
        .length,
      passed_count: assignments.filter((a: any) => a.passed === 1).length,
      absent_count: assignments.filter((a: any) => a.status === "absent")
        .length,
      pending_count: assignments.filter((a: any) => a.status === "pending")
        .length,
      average_score: this.calculateAverageScore(assignments),
      pass_rate: this.calculatePassRate(assignments),
    };

    return {
      ...plan,
      stats,
    };
  }

  /**
   * 获取考试计划的成绩分布数据（用于可视化）
   */
  @Cacheable({
    prefix: "exam:plan:score-distribution",
    ttl: 300, // 5分钟
    keyGenerator: (_userId: string, planId: string) => planId,
  })
  @QueryOptimize()
  async getPlanScoreDistribution(_userId: string, planId: string) {
    const assignments =
      (await this.examAssignmentDelegate().findMany?.({
        where: {
          plan_id: planId,
          status: "submitted",
          is_deleted: 0,
        },
        select: {
          score: true,
          passed: true,
          submitted_at: true,
        },
      })) ?? [];

    // 分数段分布（0-59, 60-69, 70-79, 80-89, 90-100）
    const scoreRanges = {
      "0-59": 0,
      "60-69": 0,
      "70-79": 0,
      "80-89": 0,
      "90-100": 0,
    };

    assignments.forEach((a: any) => {
      const score = Number(a.score || 0);
      if (score < 60) scoreRanges["0-59"]++;
      else if (score < 70) scoreRanges["60-69"]++;
      else if (score < 80) scoreRanges["70-79"]++;
      else if (score < 90) scoreRanges["80-89"]++;
      else scoreRanges["90-100"]++;
    });

    // 时间趋势（按提交时间分组）
    const timeTrend = this.groupByDate(assignments);

    return {
      score_ranges: scoreRanges,
      time_trend: timeTrend,
      total_submitted: assignments.length,
      average_score: this.calculateAverageScore(assignments),
      pass_rate: this.calculatePassRate(assignments),
    };
  }

  /**
   * 获取部门成绩对比数据
   */
  @Cacheable({
    prefix: "exam:plan:dept-comparison",
    ttl: 300, // 5分钟
    keyGenerator: (_userId: string, planId: string) => planId,
  })
  @QueryOptimize()
  async getDeptComparison(_userId: string, planId: string) {
    const assignments =
      (await this.examAssignmentDelegate().findMany?.({
        where: {
          plan_id: planId,
          is_deleted: 0,
        },
        select: {
          target_dept_id: true,
          status: true,
          score: true,
          passed: true,
        },
      })) ?? [];

    // 按部门分组统计
    const deptStats: Record<string, any> = {};

    assignments.forEach((a: any) => {
      const deptId = a.target_dept_id || "unknown";
      if (!deptStats[deptId]) {
        deptStats[deptId] = {
          dept_id: deptId,
          total: 0,
          submitted: 0,
          passed: 0,
          absent: 0,
          scores: [],
        };
      }

      deptStats[deptId].total++;
      if (a.status === "submitted") {
        deptStats[deptId].submitted++;
        deptStats[deptId].scores.push(Number(a.score || 0));
      }
      if (a.passed === 1) deptStats[deptId].passed++;
      if (a.status === "absent") deptStats[deptId].absent++;
    });

    // 计算平均分和合格率
    return Object.values(deptStats).map((dept: any) => ({
      dept_id: dept.dept_id,
      total_count: dept.total,
      submitted_count: dept.submitted,
      passed_count: dept.passed,
      absent_count: dept.absent,
      average_score:
        dept.scores.length > 0
          ? dept.scores.reduce((sum: number, s: number) => sum + s, 0) /
            dept.scores.length
          : 0,
      pass_rate: dept.submitted > 0 ? (dept.passed / dept.submitted) * 100 : 0,
      absent_rate: dept.total > 0 ? (dept.absent / dept.total) * 100 : 0,
    }));
  }

  private calculateAverageScore(assignments: any[]): number {
    const submitted = assignments.filter((a: any) => a.status === "submitted");
    if (submitted.length === 0) return 0;
    const total = submitted.reduce((sum, a) => sum + Number(a.score || 0), 0);
    return Math.round((total / submitted.length) * 100) / 100;
  }

  private calculatePassRate(assignments: any[]): number {
    const submitted = assignments.filter((a: any) => a.status === "submitted");
    if (submitted.length === 0) return 0;
    const passed = submitted.filter((a: any) => a.passed === 1).length;
    return Math.round((passed / submitted.length) * 10000) / 100;
  }

  private groupByDate(assignments: any[]): any[] {
    const grouped: Record<string, number> = {};

    assignments.forEach((a: any) => {
      if (!a.submitted_at) return;
      const date = new Date(a.submitted_at).toISOString().split("T")[0];
      grouped[date] = (grouped[date] || 0) + 1;
    });

    return Object.entries(grouped)
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date));
  }

  @Cacheable({
    prefix: "exam:my",
    ttl: 180, // 3分钟
    keyGenerator: (userId: string, _query: QueryExamResultsDto) => userId,
  })
  @QueryOptimize()
  async listMyAssignments(userId: string, _query: QueryExamResultsDto) {
    // ✅ 优化：预加载计划和试卷信息，避免N+1问题
    return (
      this.examAssignmentDelegate().findMany?.({
        where: { user_id: userId, is_deleted: 0 },
        include: {
          plan: {
            select: {
              id: true,
              plan_name: true,
              start_time: true,
              end_time: true,
              pass_score: true,
              max_attempts: true,
              allow_retake: true,
            },
          },
          paper: {
            select: {
              id: true,
              paper_name: true,
              total_score: true,
            },
          },
        },
        orderBy: { update_time: "desc" },
      }) ?? []
    );
  }

  async getMyStats(userId: string) {
    const assignments = await this.listMyAssignments(userId, {});
    const submitted = assignments.filter(
      (item: any) => item.status === "submitted",
    );
    const absent = assignments.filter(
      (item: any) => item.status === "absent" || item.status === "expired",
    );
    const passed = submitted.filter((item: any) => item.passed === 1);
    const failed = submitted.filter((item: any) => item.passed === 0);

    // 计算平均分
    const totalScore = submitted.reduce(
      (sum: number, item: any) => sum + Number(item.score ?? 0),
      0,
    );
    const averageScore =
      submitted.length > 0
        ? Math.round((totalScore / submitted.length) * 100) / 100
        : 0;

    // 计算答题正确率（按题目维度）
    let totalQuestions = 0;
    let correctQuestions = 0;
    const typeStats: Record<string, { correct: number; total: number }> = {};

    for (const item of submitted) {
      const answers: any[] = Array.isArray(item.answers) ? item.answers : [];
      for (const ans of answers) {
        totalQuestions++;
        const type = ans.question_type || "single";
        if (!typeStats[type]) typeStats[type] = { correct: 0, total: 0 };
        typeStats[type].total++;
        if (ans.correct === true) {
          correctQuestions++;
          typeStats[type].correct++;
        }
      }
    }

    const accuracy =
      totalQuestions > 0
        ? Math.round((correctQuestions / totalQuestions) * 10000) / 100
        : 0;

    return {
      average_score: averageScore,
      pass_count: passed.length,
      fail_count: failed.length,
      absent_count: absent.length,
      accuracy,
      question_type_stats: Object.entries(typeStats).map(
        ([question_type, stat]) => ({
          question_type,
          correct_count: stat.correct,
          total_count: stat.total,
          accuracy:
            stat.total > 0
              ? Math.round((stat.correct / stat.total) * 10000) / 100
              : 0,
        }),
      ),
    };
  }

  async getMyActiveExam(userId: string) {
    const assignments = await this.listMyAssignments(userId, {});
    return assignments.find((item: any) => item.status !== "submitted") ?? null;
  }

  async getMyAssignmentDetail(userId: string, id: string) {
    return this.ensureOwnedAssignment(userId, id);
  }

  async submitAssignment(userId: string, id: string, dto: SubmitExamDto) {
    return this.submitExam(userId, id, dto);
  }

  // ✅ 修复：管理员查看所有人成绩，不限制 user_id
  async listResults(_userId: string, query: QueryExamResultsDto) {
    const where: any = {
      is_deleted: 0,
      ...(query.plan_id ? { plan_id: query.plan_id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword
        ? {
            OR: [
              { employee_name: { contains: query.keyword } },
              { employee_no: { contains: query.keyword } },
            ],
          }
        : {}),
    };

    return (
      this.examAssignmentDelegate().findMany({
        where,
        include: {
          plan: {
            select: {
              id: true,
              plan_name: true,
              start_time: true,
              end_time: true,
              pass_score: true,
              max_attempts: true,
              allow_retake: true,
              allow_makeup: true,
              paper: {
                select: { id: true, paper_name: true, total_score: true },
              },
            },
          },
        },
        orderBy: { update_time: "desc" },
      }) ?? []
    );
  }

  @CacheEvict({
    prefix: "exam:my",
    pattern: "*",
  })
  async markAssignmentAbsent(
    _userId: string,
    id: string,
    dto: MarkExamAbsentDto,
  ) {
    return (
      this.examAssignmentDelegate().update?.({
        where: { id },
        data: {
          status: "absent",
          absent_reason: dto.reason,
        },
      }) ?? { id, status: "absent", absent_reason: dto.reason }
    );
  }

  async manualGradeAssignment(
    _userId: string,
    id: string,
    dto: ManualGradeDto,
  ) {
    const assignment = await this.examAssignmentDelegate().findUnique({
      where: { id },
      include: { plan: true },
    });
    if (!assignment) throw new NotFoundException("考试记录不存在");

    let currentAnswers: any[] = Array.isArray(assignment.answers)
      ? assignment.answers
      : [];

    // Create a map from grade updates
    const gradeUpdates = new Map(dto.grades.map((g) => [g.question_id, g]));

    // Apply grades to answers
    const updatedAnswers = currentAnswers.map((ans) => {
      const update = gradeUpdates.get(ans.question_id);
      if (update) {
        return {
          ...ans,
          score: update.score,
          comment: update.comment,
          manually_graded: true,
        };
      }
      return ans;
    });

    // Recalculate total score
    const totalScore = updatedAnswers.reduce(
      (sum, ans) => sum + Number(ans.score ?? 0),
      0,
    );
    const passed = totalScore >= assignment.plan.pass_score ? 1 : 0;

    const result = await this.examAssignmentDelegate().update({
      where: { id },
      data: {
        score: totalScore,
        passed,
        status: "submitted",
        answers: updatedAnswers as JsonValue,
      },
    });

    // Trigger hooks for notification or retake logic again
    await this.triggerPostGradingHooks(id);
    return result;
  }

  async getResultSummary(userId: string, query: QueryExamResultsDto) {
    const where: any = {
      is_deleted: 0,
      ...(query.plan_id ? { plan_id: query.plan_id } : {}),
      ...(query.keyword
        ? {
            OR: [
              { employee_name: { contains: query.keyword } },
              { employee_no: { contains: query.keyword } },
            ],
          }
        : {}),
      ...(query.status ? { status: query.status } : {}),
    };

    const assignments = await this.examAssignmentDelegate().findMany({
      where,
      select: {
        id: true,
        status: true,
        score: true,
        passed: true,
        target_dept_id: true,
        employee_name: true,
      },
    });

    const submitted = assignments.filter((a: any) => a.status === "submitted");
    const absent = assignments.filter(
      (a: any) => a.status === "absent" || a.status === "expired",
    );
    const passed = submitted.filter((a: any) => a.passed === 1);
    const scores = submitted.map((a: any) => Number(a.score ?? 0));
    const totalScore = scores.reduce((s: number, v: number) => s + v, 0);
    const avgScore =
      submitted.length > 0
        ? Math.round((totalScore / submitted.length) * 100) / 100
        : 0;

    // 按部门统计
    const deptMap: Record<string, any> = {};
    for (const a of assignments) {
      const deptId = a.target_dept_id || "unknown";
      if (!deptMap[deptId]) {
        deptMap[deptId] = {
          dept_id: deptId,
          dept_name: deptId,
          total: 0,
          submitted: 0,
          passed: 0,
          absent: 0,
          scores: [],
        };
      }
      deptMap[deptId].total++;
      if (a.status === "submitted") {
        deptMap[deptId].submitted++;
        deptMap[deptId].scores.push(Number(a.score ?? 0));
      }
      if (a.passed === 1) deptMap[deptId].passed++;
      if (a.status === "absent" || a.status === "expired")
        deptMap[deptId].absent++;
    }

    const department_stats = Object.values(deptMap).map((d: any) => ({
      dept_id: d.dept_id,
      dept_name: d.dept_name,
      total_count: d.total,
      submitted_count: d.submitted,
      pass_count: d.passed,
      absent_count: d.absent,
      average_score:
        d.scores.length > 0
          ? Math.round(
              (d.scores.reduce((s: number, v: number) => s + v, 0) /
                d.scores.length) *
                100,
            ) / 100
          : 0,
      pass_rate:
        d.submitted > 0
          ? Math.round((d.passed / d.submitted) * 10000) / 100
          : 0,
      absent_rate:
        d.total > 0 ? Math.round((d.absent / d.total) * 10000) / 100 : 0,
    }));

    return {
      total_count: assignments.length,
      submitted_count: submitted.length,
      pending_count: assignments.filter((a: any) => a.status === "pending")
        .length,
      absent_count: absent.length,
      pass_count: passed.length,
      fail_count: submitted.length - passed.length,
      average_score: avgScore,
      highest_score: scores.length > 0 ? Math.max(...scores) : 0,
      lowest_score: scores.length > 0 ? Math.min(...scores) : 0,
      pass_rate:
        submitted.length > 0
          ? Math.round((passed.length / submitted.length) * 10000) / 100
          : 0,
      absent_rate:
        assignments.length > 0
          ? Math.round((absent.length / assignments.length) * 10000) / 100
          : 0,
      department_stats,
    };
  }

  async getQuestionItemStats(_userId: string, planId: string) {
    const assignments = await this.examAssignmentDelegate().findMany({
      where: { plan_id: planId, status: "submitted", is_deleted: 0 },
      select: { answers: true },
    });

    const statsMap = new Map<
      string,
      { total: number; correct: number; zeroScore: number }
    >();

    for (const assignment of assignments) {
      if (!Array.isArray(assignment.answers)) continue;
      for (const ans of assignment.answers) {
        if (!ans.question_id) continue;
        const current = statsMap.get(ans.question_id) || {
          total: 0,
          correct: 0,
          zeroScore: 0,
        };
        current.total += 1;
        if (ans.correct === true) current.correct += 1;
        if (Number(ans.score ?? 0) === 0) current.zeroScore += 1;
        statsMap.set(ans.question_id, current);
      }
    }

    return Array.from(statsMap.entries()).map(([questionId, stats]) => ({
      question_id: questionId,
      total_answers: stats.total,
      correct_count: stats.correct,
      error_rate: stats.total > 0 ? (stats.zeroScore / stats.total) * 100 : 0,
    }));
  }

  async submitExam(userId: string, id: string, dto: SubmitExamDto) {
    const assignment = await this.ensureOwnedAssignment(userId, id);
    const enrichedAssignment = this.enrichAssignment(assignment);

    if (enrichedAssignment.status === "submitted") {
      if (enrichedAssignment.can_retake) {
        throw new ForbiddenException("请重新进入考试后再开始下一次作答");
      }
      return enrichedAssignment;
    }

    if (enrichedAssignment.status === "expired") {
      throw new ForbiddenException(
        enrichedAssignment.absent_reason ?? "考试已过期",
      );
    }

    const now = Date.now();
    const planStart = new Date(assignment.plan.start_time).getTime();
    const planEnd = new Date(assignment.plan.end_time).getTime();
    if (now < planStart) throw new ForbiddenException("考试尚未开始");
    if (now > planEnd) throw new ForbiddenException("考试已结束，无法交卷");
    if (
      assignment.started_at &&
      now > this.resolveAssignmentDeadline(assignment).getTime()
    ) {
      throw new ForbiddenException("考试时间已到，无法继续交卷");
    }

    await this.examQueue.add("submit-exam", {
      assignmentId: id,
      answers: dto.answers,
      userId,
    });
    return { success: true, message: "试卷已提交，后台正在判卷" };
  }

  async performGrading(assignmentId: string, answers: any[], _userId: string) {
    this.logger.log(`Grading assignment: ${assignmentId}`);

    // ✅ 优化：分步查询，避免深层嵌套
    const assignment = await this.examAssignmentDelegate().findUnique({
      where: { id: assignmentId },
      include: {
        plan: {
          select: {
            id: true,
            paper_id: true,
            pass_score: true,
            allow_makeup: true,
          },
        },
      },
    });

    if (!assignment) return;

    // ✅ 优化：使用缓存获取试卷题目
    const paper = await this.getPaperWithQuestionsForGrading(
      assignment.plan.paper_id,
    );
    if (!paper || !paper.questions) return;

    const answerMap = new Map(
      answers.map((item: any) => [item.question_id, item.answer]),
    );
    let score = 0;
    let correctCount = 0;

    const evaluatedAnswers = paper.questions.map(
      (question: Record<string, any>) => {
        const answer = answerMap.get(question.id);
        const correct = this.isCorrectAnswer(question, answer);
        if (correct) {
          score += Number(question.score ?? 0);
          correctCount += 1;
        }
        return {
          question_id: question.id,
          answer,
          correct,
          score: correct ? Number(question.score ?? 0) : 0,
          question_type: question.question_type,
        };
      },
    );

    const passed = score >= assignment.plan.pass_score ? 1 : 0;
    const nextAttemptCount = Number(assignment.attempt_count ?? 0) + 1;
    const history = Array.isArray(assignment.attempts_history)
      ? [...(assignment.attempts_history as any[])]
      : [];
    history.push({
      attempt_no: nextAttemptCount,
      submitted_at: new Date().toISOString(),
      score,
      passed,
      correct_count: correctCount,
      question_count: paper.questions.length,
      answers: evaluatedAnswers,
    });

    await this.examAssignmentDelegate().update({
      where: { id: assignmentId },
      data: {
        status: "submitted",
        submitted_at: new Date(),
        attempt_count: nextAttemptCount,
        score,
        passed,
        auto_graded: 1,
        answers: evaluatedAnswers as JsonValue,
        attempts_history: history as JsonValue,
        correct_count: correctCount,
        question_count: paper.questions.length,
      },
    });

    // 清除相关缓存
    await this.clearAssignmentCaches(assignment.user_id);
  }

  /**
   * 获取试卷题目（用于判卷，带缓存）
   */
  private async getPaperWithQuestionsForGrading(paperId: string) {
    // 尝试从缓存获取
    const cacheKey = `exam:paper:questions:${paperId}`;
    const cached = await this.prisma["redis"]?.get?.(cacheKey);

    if (cached) {
      try {
        return JSON.parse(cached);
      } catch (e) {
        // 缓存解析失败，继续查询数据库
      }
    }

    // 从数据库查询
    const paper = await this.examPaperDelegate().findUnique({
      where: { id: paperId },
      include: {
        questions: {
          where: { is_deleted: 0 },
          orderBy: { sort: "asc" },
          select: {
            id: true,
            question_type: true,
            title: true,
            options: true,
            correct_answer: true,
            score: true,
            explanation: true,
          },
        },
      },
    });

    // 缓存结果（10分钟）
    if (paper && this.prisma["redis"]?.set) {
      await this.prisma["redis"].set(cacheKey, JSON.stringify(paper), 600);
    }

    return paper;
  }

  /**
   * 清除考生相关缓存
   */
  private async clearAssignmentCaches(userId: string) {
    if (this.prisma["redis"]?.del) {
      await this.prisma["redis"].del(`exam:my:${userId}`);
    }
  }

  private async ensureOwnedAssignment(userId: string, id: string) {
    const assignment = await this.examAssignmentDelegate().findUnique?.({
      where: { id },
      include: {
        plan: {
          include: {
            paper: {
              include: {
                questions: {
                  where: { is_deleted: 0 },
                  orderBy: { sort: "asc" },
                },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException("考试记录不存在");
    }

    if (assignment.user_id && assignment.user_id !== userId) {
      throw new ForbiddenException("无权访问当前考试记录");
    }

    return assignment;
  }

  private enrichAssignment(assignment: any) {
    const deadline = this.resolveAssignmentDeadline(assignment);
    const expired =
      Date.now() > deadline.getTime() && assignment.status !== "submitted";
    return {
      ...assignment,
      status: expired ? "expired" : assignment.status,
      can_retake: Number(assignment.can_retake ?? 0) === 1,
      absent_reason: assignment.absent_reason ?? null,
    };
  }

  private resolveAssignmentDeadline(assignment: any) {
    if (assignment.deadline_at) {
      return new Date(assignment.deadline_at);
    }

    const start = assignment.started_at
      ? new Date(assignment.started_at).getTime()
      : Date.now();
    const durationMinutes = Number(assignment.plan?.duration_minutes ?? 60);
    return new Date(start + durationMinutes * 60 * 1000);
  }

  async triggerPostGradingHooks(assignmentId: string) {
    const assignment = await this.examAssignmentDelegate().findUnique({
      where: { id: assignmentId },
      include: { plan: true },
    });
    if (!assignment) return;

    await this.messageService.send({
      recipientId: assignment.user_id,
      title: "考试结果通知",
      content: `考试《${assignment.plan.plan_name}》已判卷，得分：${assignment.score}，结果：${assignment.passed === 1 ? "合格" : "不合格"}。`,
      messageType: "exam_result",
      bizType: "exam_assignment",
      bizId: assignment.id,
      route: "/exam/my",
    });

    if (assignment.passed === 0 && assignment.plan.allow_makeup === 1) {
      await this.examAssignmentDelegate().update({
        where: { id: assignmentId },
        data: { status: "pending" },
      });
      this.logger.log(
        `Automatic retake enabled for assignment: ${assignmentId}`,
      );
    }
  }

  private isCorrectAnswer(question: Record<string, any>, answer: any) {
    const type = question.question_type;
    const correctAnswer = question.correct_answer;

    if (type === "multiple") {
      const actual = Array.isArray(answer) ? answer.map(String).sort() : [];
      const expected = Array.isArray(correctAnswer)
        ? correctAnswer.map(String).sort()
        : [];
      return (
        actual.length === expected.length &&
        actual.every((item, index) => item === expected[index])
      );
    }

    if (type === "fill") {
      // 填空题：简单的关键词包含匹配
      if (!answer || !correctAnswer) return false;
      const expectedArr = Array.isArray(correctAnswer)
        ? correctAnswer
        : [correctAnswer];
      return expectedArr.some((k: string) => String(answer).includes(k));
    }

    if (type === "judge") return String(answer) === String(correctAnswer);
    return (
      String(answer) ===
      String(Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer)
    );
  }

  // ✅ 新增：批量标记缺考（PRD 一.5.3）
  async batchMarkAbsent(
    _userId: string,
    planId: string,
    items: Array<{ employee_id?: string; user_id?: string; reason?: string }>,
  ) {
    const results: Array<{ id: string; success: boolean; error?: string }> = [];

    for (const item of items) {
      try {
        const where: any = { plan_id: planId, is_deleted: 0 };
        if (item.user_id) where.user_id = item.user_id;
        else if (item.employee_id) where.employee_id = item.employee_id;
        else continue;

        const assignment = await this.examAssignmentDelegate().findFirst({
          where,
        });
        if (!assignment) {
          results.push({
            id: item.user_id || item.employee_id || "",
            success: false,
            error: "未找到考试记录",
          });
          continue;
        }

        await this.examAssignmentDelegate().update({
          where: { id: assignment.id },
          data: {
            status: "absent",
            manual_absent_marked: 1,
            manual_absent_reason: item.reason || "管理员批量标记缺考",
          },
        });
        results.push({ id: assignment.id, success: true });
      } catch (e: any) {
        results.push({
          id: item.user_id || item.employee_id || "",
          success: false,
          error: e.message,
        });
      }
    }

    return {
      total: items.length,
      success: results.filter((r) => r.success).length,
      results,
    };
  }

  // ✅ 新增：考试结果导出（PRD 一.5.3）
  async exportResults(userId: string, query: QueryExamResultsDto) {
    const where: any = {
      is_deleted: 0,
      ...(query.plan_id ? { plan_id: query.plan_id } : {}),
      ...(query.status ? { status: query.status } : {}),
      ...(query.keyword
        ? {
            OR: [
              { employee_name: { contains: query.keyword } },
              { employee_no: { contains: query.keyword } },
            ],
          }
        : {}),
    };

    const assignments = await this.examAssignmentDelegate().findMany({
      where,
      include: {
        plan: { select: { plan_name: true, pass_score: true } },
      },
      orderBy: { submitted_at: "desc" },
    });

    return assignments.map((a: any) => ({
      employee_name: a.employee_name || "-",
      employee_no: a.employee_no || "-",
      plan_name: a.plan?.plan_name || "-",
      status:
        {
          pending: "待考试",
          submitted: "已交卷",
          absent: "缺考",
          expired: "已过期",
        }[a.status] || a.status,
      score: a.score ?? "-",
      passed: a.passed === 1 ? "通过" : a.passed === 0 ? "未通过" : "-",
      attempt_count: a.attempt_count ?? 0,
      submitted_at: a.submitted_at
        ? new Date(a.submitted_at).toLocaleString()
        : "-",
      absent_reason: a.manual_absent_reason || "-",
    }));
  }
}
