import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../common/services/redis.service";

@Injectable()
export class ExamCronService {
  private readonly logger = new Logger(ExamCronService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  private get examPlanDelegate() {
    return this.prisma["exam_plan" as keyof typeof this.prisma] as any;
  }

  private get examAssignmentDelegate() {
    return this.prisma["exam_assignment" as keyof typeof this.prisma] as any;
  }

  /**
   * 定时扫描缺考考生
   * 逻辑：考试开始超过absent_mark_minutes分钟未进入考试的考生自动标记为缺考
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoMarkAbsenteeism() {
    this.logger.log("Starting automated absenteeism marking scan...");

    const now = new Date();

    // 查找所有进行中的考试计划
    const plans = await this.examPlanDelegate.findMany({
      where: {
        status: "published",
        start_time: { lte: now },
        end_time: { gte: now },
        is_deleted: 0,
      },
      select: {
        id: true,
        plan_name: true,
        start_time: true,
        absent_mark_minutes: true,
      },
    });

    let totalMarked = 0;

    for (const plan of plans) {
      // 计算缺考标记阈值时间
      const absentThreshold = new Date(
        new Date(plan.start_time).getTime() +
          (plan.absent_mark_minutes || 30) * 60000,
      );

      // 如果还没到标记时间，跳过
      if (now < absentThreshold) continue;

      // 查找该计划中未开始考试的分配记录
      const assignments = await this.examAssignmentDelegate.findMany({
        where: {
          plan_id: plan.id,
          status: "pending",
          started_at: null,
          manual_absent_marked: 0,
          is_deleted: 0,
        },
        select: {
          id: true,
          user_id: true,
          employee_name: true,
        },
      });

      if (assignments.length === 0) continue;

      // 批量标记缺考
      const assignmentIds = assignments.map((a: any) => a.id);
      await this.examAssignmentDelegate.updateMany({
        where: { id: { in: assignmentIds } },
        data: {
          status: "absent",
          manual_absent_marked: 1,
          manual_absent_reason: `系统自动标记：考试开始${plan.absent_mark_minutes}分钟内未进入`,
        },
      });

      totalMarked += assignments.length;
      this.logger.log(
        `Plan [${plan.plan_name}]: Marked ${assignments.length} assignments as absent.`,
      );

      // 清除相关缓存
      for (const assignment of assignments) {
        await this.redisService.del(`exam:my:${assignment.user_id}`);
      }
    }

    this.logger.log(
      `Absenteeism marking completed. Total marked: ${totalMarked}`,
    );
  }
}
