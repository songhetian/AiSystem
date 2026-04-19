import { Processor, WorkerHost, OnWorkerEvent } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScheduleAlgorithmService } from '../services/schedule-algorithm.service';
import { EmployeeScheduleService } from '../services/employee-schedule.service';
import { ScheduleAsyncService } from '../services/schedule-async.service';

/**
 * 异步排班任务处理器 (V4.0)
 *
 * 功能：
 * 1. 后台异步生成大规模排班
 * 2. 实时更新任务进度
 * 3. 完成后通知用户
 */
@Processor('schedule-queue')
export class ScheduleAsyncWorker extends WorkerHost {
  private readonly logger = new Logger(ScheduleAsyncWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleAlgorithmService: ScheduleAlgorithmService,
    private readonly employeeScheduleService: EmployeeScheduleService,
    private readonly scheduleAsyncService: ScheduleAsyncService,
  ) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    try {
      if (job.name === 'generate-schedule') {
        return await this.handleGenerateSchedule(job);
      }
    } catch (error) {
      this.logger.error(`[Worker Error] 任务 ${job.id} 执行失败: ${error instanceof Error ? error.message : String(error)}`, error instanceof Error ? error.stack : undefined);
      throw error;
    }
  }

  /**
   * 处理排班生成任务
   */
  private async handleGenerateSchedule(job: Job) {
    const { userId, dept_id, start_date, end_date, config } = job.data;

    this.logger.log(`开始处理排班任务: ${job.id}, 部门: ${dept_id}, 周期: ${start_date} ~ ${end_date}`);

    // 更新进度: 10%
    await job.updateProgress(10);

    // 1. 获取员工列表
    const employees = await this.prisma.hr_employee.findMany({
      where: {
        department_id: dept_id,
        is_deleted: 0,
        status: 1,
      },
    });

    if (employees.length === 0) {
      throw new Error('该部门下无可用员工');
    }

    // 更新进度: 20%
    await job.updateProgress(20);

    // 2. 批量获取员工偏好
    const preferencesMap = await this.employeeScheduleService.getPreferencesBatch(
      employees.map(e => e.id)
    );

    // 更新进度: 30%
    await job.updateProgress(30);

    // 3. 获取班次列表
    const shifts = await this.prisma.attendance_rule.findMany({
      where: {
        dept_id,
        is_deleted: 0,
        status: 1,
      },
    });

    if (shifts.length === 0) {
      throw new Error('未找到可用班次规则');
    }

    // 更新进度: 40%
    await job.updateProgress(40);

    // 4. 获取人力需求
    const demandRecords = await this.prisma.attendance_staffing_demand.findMany({
      where: {
        dept_id,
        date: { gte: new Date(start_date), lte: new Date(end_date) },
        is_deleted: 0,
      },
    });

    const demandMap = new Map<string, number>();
    demandRecords.forEach(d => {
      const dKey = `${d.date.toISOString().split('T')[0]}_${d.shift_name}`;
      demandMap.set(dKey, d.required_count);
    });

    // 更新进度: 50%
    await job.updateProgress(50);

    // 5. 生成日期列表
    const days: string[] = [];
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    for (let d = new Date(startDate); d <= endDate; d.setDate(d.getDate() + 1)) {
      days.push(d.toISOString().split('T')[0]);
    }

    // 6. 运行排班算法
    const scheduleData = this.scheduleAlgorithmService.runSchedulingEngine(
      employees as any,
      shifts,
      days,
      config.priority || 'fairness',
      config.lock_employee_ids || [],
      {
        maxConsecutiveDays: config.max_consecutive_days || 6,
        maxWeekHours: config.max_hours_per_week || 40,
        maxDayHours: config.daily_max_hours || 8,
        minStaff: config.min_staff_per_shift || 1,
      },
      preferencesMap,
      demandMap
    );

    // 更新进度: 80%
    await job.updateProgress(80);

    // 7. 保存排班结果
    const validData = scheduleData.filter(item => item.employee_id !== '__shortage__');

    await this.prisma.$transaction(async (tx) => {
      // 删除旧排班
      await tx.attendance_schedule.deleteMany({
        where: {
          dept_id,
          schedule_date: { gte: startDate, lte: endDate },
        },
      });

      // 创建新排班
      await tx.attendance_schedule.createMany({
        data: validData.map(item => ({
          employee_id: item.employee_id,
          schedule_date: new Date(item.schedule_date),
          shift_name: item.shift_name,
          dept_id: item.dept_id,
          platform_id: config.platform_id,
          status: 0, // 待发布
        })),
      });
    });

    // 更新进度: 90%
    await job.updateProgress(90);

    // 8. 保存历史记录
    const warningCount = scheduleData.filter(item => item.is_warning).length;
    const complianceRate = Math.round(((scheduleData.length - warningCount) / scheduleData.length) * 100);

    await this.prisma.attendance_schedule_history.create({
      data: {
        draft_name: `异步排班-${new Date().toISOString().split('T')[0]}`,
        mode: config.priority || 'fairness',
        platform_id: config.platform_id,
        dept_id,
        start_date: startDate,
        end_date: endDate,
        total_scheduled: validData.length,
        warning_count: warningCount,
        compliance_rate: complianceRate,
        satisfaction_rate: 0,
        fitting_rate: 0,
        applied_by: userId,
        applied_at: new Date(),
        items_count: validData.length,
        schedule_data: scheduleData as any,
        config_params: config as any,
      },
    });

    // 更新进度: 100%
    await job.updateProgress(100);

    // 9. 通知用户
    await this.scheduleAsyncService.notifyJobComplete(userId, job.id as string, {
      count: validData.length,
      warningCount,
      complianceRate,
    });

    this.logger.log(`排班任务完成: ${job.id}, 生成 ${validData.length} 条排班记录`);

    return {
      success: true,
      count: validData.length,
      warningCount,
      complianceRate,
    };
  }

  @OnWorkerEvent('failed')
  onFailed(job: Job, error: Error) {
    this.logger.warn(`任务 ${job.id} 最终失败: ${error.message} (已尝试 ${job.attemptsMade} 次)`);

    // 通知用户任务失败
    if (job.data.userId) {
      this.scheduleAsyncService.notifyJobFailed(
        job.data.userId,
        job.id as string,
        error.message
      ).catch(err => {
        this.logger.error(`通知用户失败: ${err.message}`);
      });
    }
  }

  @OnWorkerEvent('completed')
  onCompleted(job: Job) {
    this.logger.log(`任务 ${job.id} 成功完成`);
  }
}
