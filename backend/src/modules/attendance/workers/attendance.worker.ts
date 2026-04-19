import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AttendanceRecordsService } from '../services/attendance-records.service';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * 考勤自动化计算 Worker (V5.0)
 * 职责：异步重算考勤状态，并触发月度汇总聚合。
 */
@Processor('attendance-queue')
export class AttendanceWorker extends WorkerHost {
  private readonly logger = new Logger(AttendanceWorker.name);

  constructor(
    private readonly recordsService: AttendanceRecordsService,
    private readonly prisma: PrismaService
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      if (job.name === 'recalculate') {
        const { recordId } = job.data;

        // 1. 执行核心考勤逻辑重算
        await this.recordsService.reCalculate(recordId);

        // 2. 触发月度汇总表预处理 (V5.0 高级优化)
        // 注意：reCalculate 返回 void，这里我们重新查询记录
        const updatedRecord = await this.prisma.attendance_record.findUnique({
          where: { id: recordId }
        });

        if (updatedRecord) {
          const date = new Date(updatedRecord.attendance_date);
          const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;

          await this.recordsService.updateMonthlySummary(updatedRecord.employee_id, month);
          this.logger.debug(`[V5.0] 已更新员工 ${updatedRecord.employee_id} 在 ${month} 的月度汇总快照`);
        }

        return { success: true };
      }
    } catch (error) {
      this.logger.error(`[Worker Error] 任务 ${job.id} 执行失败: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      // 抛出异常以激活 BullMQ 的重试机制 (Exponential Backoff)
      throw error;
    }
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.warn(`任务 ${job.id} 最终失败: ${error.message} (已尝试 ${job.attemptsMade} 次)`);
  }
}
