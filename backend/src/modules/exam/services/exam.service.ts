import { BadRequestException, ForbiddenException, Injectable, NotFoundException, Logger } from '@nestjs/common';
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
    @InjectQueue('exam-queue') private readonly examQueue: Queue
  ) {}

  // ... (Existing private delegate methods and helper methods remain unchanged)
  private examPaperDelegate() { return (this.prisma as any).exam_paper; }
  private examPlanDelegate() { return (this.prisma as any).exam_plan; }
  private examAssignmentDelegate() { return (this.prisma as any).exam_assignment; }
  
  // 保持原有 helper 方法 (ensureOwnedAssignment, enrichAssignment 等)...
  // (Note: To save context, omitted helper implementation details in this truncated version)

  async submitExam(userId: string, id: string, dto: SubmitExamDto) {
    const assignment = await this.ensureOwnedAssignment(userId, id);
    const enrichedAssignment = this.enrichAssignment(assignment);

    if (enrichedAssignment.status === 'submitted') {
      if (enrichedAssignment.can_retake) throw new ForbiddenException('请重新进入考试后再开始下一次作答');
      return enrichedAssignment;
    }

    if (enrichedAssignment.status === 'expired') {
      throw new ForbiddenException(enrichedAssignment.can_retake ? '请重新进入考试后参加补考' : enrichedAssignment.absent_reason ?? '考试已缺考');
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
    return { success: true, message: '试卷已提交，后台判卷中...' };
  }

  async performGrading(assignmentId: string, answers: any[], userId: string) {
    this.logger.log(`Grading assignment: ${assignmentId}`);
    const assignment = await this.examAssignmentDelegate().findUnique({
      where: { id: assignmentId },
      include: { plan: { include: { paper: { include: { questions: { where: { is_deleted: 0 }, orderBy: { sort: 'asc' } } } } } } }
    });

    if (!assignment) return;
    const paper = assignment.plan.paper;
    const answerMap = new Map(answers.map((item: any) => [item.question_id, item.answer]));
    let score = 0;
    let correctCount = 0;

    const evaluatedAnswers = paper.questions.map((question: Record<string, any>) => {
      const answer = answerMap.get(question.id);
      const correct = this.isCorrectAnswer(question, answer);
      if (correct) { score += Number(question.score ?? 0); correctCount += 1; }
      return { question_id: question.id, answer, correct, score: correct ? Number(question.score ?? 0) : 0 };
    });

    const passed = score >= assignment.plan.pass_score ? 1 : 0;
    const nextAttemptCount = Number(assignment.attempt_count ?? 0) + 1;
    const history = Array.isArray(assignment.attempts_history) ? [...(assignment.attempts_history as any[])] : [];
    history.push({
      attempt_no: nextAttemptCount, submitted_at: new Date().toISOString(), score, passed, correct_count: correctCount, question_count: paper.questions.length, answers: evaluatedAnswers
    });

    await this.examAssignmentDelegate().update({
      where: { id: assignmentId },
      data: {
        status: 'submitted', submitted_at: new Date(), attempt_count: nextAttemptCount, score, passed, auto_graded: 1,
        answers: evaluatedAnswers as JsonValue, attempts_history: history as JsonValue, correct_count: correctCount, question_count: paper.questions.length
      }
    });
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