import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../../../prisma/prisma.service';

@Injectable()
export class ExamCronService {
  private readonly logger = new Logger(ExamCronService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 定时扫描缺考考生
   * 逻辑：考试开始超过 30 分钟未进入考试的考生自动标记为缺考
   */
  @Cron(CronExpression.EVERY_5_MINUTES)
  async autoMarkAbsenteeism() {
    this.logger.log('Starting automated absenteeism marking scan...');
    
    const now = new Date();
    const thresholdDate = new Date(now.getTime() - 30 * 60000); // 30分钟前

    // 查找所有进行中的考试计划
    const plans = await (this.prisma as any).exam_plan.findMany({
      where: {
        status: 'published',
        start_time: { lte: thresholdDate },
        end_time: { gte: now }
      }
    });

    for (const plan of plans) {
      // 查找该计划中未开始考试的分配记录
      const assignments = await (this.prisma as any).exam_assignment.findMany({
        where: {
          plan_id: plan.id,
          status: 'pending',
          started_at: null,
          manual_absent_marked: 0
        }
      });

      for (const assignment of assignments) {
        await (this.prisma as any).exam_assignment.update({
          where: { id: assignment.id },
          data: {
            status: 'absent',
            manual_absent_marked: 1,
            manual_absent_reason: '系统自动标记：考试开始30分钟内未进入'
          }
        });
        this.logger.log(`Marked assignment ${assignment.id} as absent.`);
      }
    }
  }
}
