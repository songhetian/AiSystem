import { ForbiddenException, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { Prisma } from '@prisma/client';
import { MessageService } from '../../../common/services/message.service';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateExamPlanDto } from '../dto/create-exam-plan.dto';
import { MarkExamAbsentDto } from '../dto/mark-exam-absent.dto';
import { QueryExamPlansDto } from '../dto/query-exam-plans.dto';
import { QueryExamResultsDto } from '../dto/query-exam-results.dto';
import { SaveExamPaperDto } from '../dto/save-exam-paper.dto';
import { SubmitExamDto } from '../dto/submit-exam.dto';

type JsonValue = Prisma.InputJsonValue | Prisma.JsonValue;

@Injectable()
export class ExamService {
  private readonly logger = new Logger(ExamService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly messageService: MessageService,
    @InjectQueue('exam-queue') private readonly examQueue: Queue,
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

  async listPapers(_userId: string) {
    return this.examPaperDelegate().findMany?.({
      where: { is_deleted: 0 },
      orderBy: { update_time: 'desc' },
    }) ?? [];
  }

  async getPaper(_userId: string, id: string) {
    return this.examPaperDelegate().findUnique?.({ where: { id } });
  }

  async createPaper(userId: string, dto: SaveExamPaperDto) {
    await this.scopeService.resolveAccess(userId);
    return this.examPaperDelegate().create?.({ data: dto }) ?? dto;
  }

  async updatePaper(userId: string, id: string, dto: SaveExamPaperDto) {
    await this.scopeService.resolveAccess(userId);
    return this.examPaperDelegate().update?.({ where: { id }, data: dto }) ?? { id, ...dto };
  }

  async listPlans(_userId: string, query: QueryExamPlansDto) {
    return this.examPlanDelegate().findMany?.({
      where: {
        is_deleted: 0,
        ...(query.keyword ? { plan_name: { contains: query.keyword } } : {}),
      },
      orderBy: { update_time: 'desc' },
    }) ?? [];
  }

  async createPlan(userId: string, dto: CreateExamPlanDto) {
    await this.scopeService.resolveAccess(userId);
    return this.examPlanDelegate().create?.({ data: dto }) ?? dto;
  }

  async listMyAssignments(userId: string, _query: QueryExamResultsDto) {
    return this.examAssignmentDelegate().findMany?.({
      where: { user_id: userId, is_deleted: 0 },
      orderBy: { update_time: 'desc' },
    }) ?? [];
  }

  async getMyStats(userId: string) {
    const assignments = await this.listMyAssignments(userId, {});
    const submitted = assignments.filter((item: any) => item.status === 'submitted').length;
    return {
      total: assignments.length,
      submitted,
      pending: assignments.length - submitted,
    };
  }

  async getMyActiveExam(userId: string) {
    const assignments = await this.listMyAssignments(userId, {});
    return assignments.find((item: any) => item.status !== 'submitted') ?? null;
  }

  async getMyAssignmentDetail(userId: string, id: string) {
    return this.ensureOwnedAssignment(userId, id);
  }

  async submitAssignment(userId: string, id: string, dto: SubmitExamDto) {
    return this.submitExam(userId, id, dto);
  }

  async listResults(userId: string, _query: QueryExamResultsDto) {
    return this.listMyAssignments(userId, {});
  }

  async markAssignmentAbsent(_userId: string, id: string, dto: MarkExamAbsentDto) {
    return this.examAssignmentDelegate().update?.({
      where: { id },
      data: {
        status: 'absent',
        absent_reason: dto.reason,
      },
    }) ?? { id, status: 'absent', absent_reason: dto.reason };
  }

  async getResultSummary(userId: string, _query: QueryExamResultsDto) {
    const assignments = await this.listMyAssignments(userId, {});
    const scores = assignments.map((item: any) => Number(item.score ?? 0));
    const averageScore = scores.length > 0 ? scores.reduce((sum, score) => sum + score, 0) / scores.length : 0;
    return {
      total: assignments.length,
      average_score: averageScore,
      passed: assignments.filter((item: any) => Number(item.passed) === 1).length,
    };
  }

  async submitExam(userId: string, id: string, dto: SubmitExamDto) {
    const assignment = await this.ensureOwnedAssignment(userId, id);
    const enrichedAssignment = this.enrichAssignment(assignment);

    if (enrichedAssignment.status === 'submitted') {
      if (enrichedAssignment.can_retake) {
        throw new ForbiddenException('请重新进入考试后再开始下一次作答');
      }
      return enrichedAssignment;
    }

    if (enrichedAssignment.status === 'expired') {
      throw new ForbiddenException(enrichedAssignment.absent_reason ?? '考试已过期');
    }

    const now = Date.now();
    const planStart = new Date(assignment.plan.start_time).getTime();
    const planEnd = new Date(assignment.plan.end_time).getTime();
    if (now < planStart) throw new ForbiddenException('考试尚未开始');
    if (now > planEnd) throw new ForbiddenException('考试已结束，无法交卷');
    if (assignment.started_at && now > this.resolveAssignmentDeadline(assignment).getTime()) {
      throw new ForbiddenException('考试时间已到，无法继续交卷');
    }

    await this.examQueue.add('submit-exam', { assignmentId: id, answers: dto.answers, userId });
    return { success: true, message: '试卷已提交，后台正在判卷' };
  }

  async performGrading(assignmentId: string, answers: any[], _userId: string) {
    this.logger.log(`Grading assignment: ${assignmentId}`);
    const assignment = await this.examAssignmentDelegate().findUnique({
      where: { id: assignmentId },
      include: { plan: { include: { paper: { include: { questions: { where: { is_deleted: 0 }, orderBy: { sort: 'asc' } } } } } } },
    });

    if (!assignment) return;
    const paper = assignment.plan.paper;
    const answerMap = new Map(answers.map((item: any) => [item.question_id, item.answer]));
    let score = 0;
    let correctCount = 0;

    const evaluatedAnswers = paper.questions.map((question: Record<string, any>) => {
      const answer = answerMap.get(question.id);
      const correct = this.isCorrectAnswer(question, answer);
      if (correct) {
        score += Number(question.score ?? 0);
        correctCount += 1;
      }
      return { question_id: question.id, answer, correct, score: correct ? Number(question.score ?? 0) : 0 };
    });

    const passed = score >= assignment.plan.pass_score ? 1 : 0;
    const nextAttemptCount = Number(assignment.attempt_count ?? 0) + 1;
    const history = Array.isArray(assignment.attempts_history) ? [...(assignment.attempts_history as any[])] : [];
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
        status: 'submitted',
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
  }

  private async ensureOwnedAssignment(userId: string, id: string) {
    const assignment = await this.examAssignmentDelegate().findUnique?.({
      where: { id },
      include: {
        plan: {
          include: {
            paper: {
              include: {
                questions: { where: { is_deleted: 0 }, orderBy: { sort: 'asc' } },
              },
            },
          },
        },
      },
    });

    if (!assignment) {
      throw new NotFoundException('考试记录不存在');
    }

    if (assignment.user_id && assignment.user_id !== userId) {
      throw new ForbiddenException('无权访问当前考试记录');
    }

    return assignment;
  }

  private enrichAssignment(assignment: any) {
    const deadline = this.resolveAssignmentDeadline(assignment);
    const expired = Date.now() > deadline.getTime() && assignment.status !== 'submitted';
    return {
      ...assignment,
      status: expired ? 'expired' : assignment.status,
      can_retake: Number(assignment.can_retake ?? 0) === 1,
      absent_reason: assignment.absent_reason ?? null,
    };
  }

  private resolveAssignmentDeadline(assignment: any) {
    if (assignment.deadline_at) {
      return new Date(assignment.deadline_at);
    }

    const start = assignment.started_at ? new Date(assignment.started_at).getTime() : Date.now();
    const durationMinutes = Number(assignment.plan?.duration_minutes ?? 60);
    return new Date(start + durationMinutes * 60 * 1000);
  }

  private isCorrectAnswer(question: Record<string, any>, answer: any) {
    const type = question.question_type;
    const correctAnswer = question.correct_answer;
    if (type === 'multiple') {
      const actual = Array.isArray(answer) ? answer.map(String).sort() : [];
      const expected = Array.isArray(correctAnswer) ? correctAnswer.map(String).sort() : [];
      return actual.length === expected.length && actual.every((item, index) => item === expected[index]);
    }
    if (type === 'judge') return String(answer) === String(correctAnswer);
    return String(answer) === String(Array.isArray(correctAnswer) ? correctAnswer[0] : correctAnswer);
  }
}
