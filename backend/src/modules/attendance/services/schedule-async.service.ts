import { Injectable, Logger } from '@nestjs/common';
import { InjectQueue } from '@nestjs/bullmq';
import { Queue } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeService } from '../../../common/services/realtime.service';

/**
 * 异步排班服务
 * 
 * 功能：
 * 1. 后台异步生成大规模排班
 * 2. 任务进度追踪
 * 3. 完成后实时通知
 * 4. 支持任务取消
 */
@Injectable()
export class ScheduleAsyncService {
  private readonly logger = new Logger(ScheduleAsyncService.name);

  constructor(
    @InjectQueue('schedule-queue') private scheduleQueue: Queue,
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
  ) {}

  /**
   * 提交异步排班任务
   */
  async submitScheduleJob(
    userId: string,
    jobData: {
      dept_id: string;
      start_date: string;
      end_date: string;
      config: any;
    }
  ) {
    // 创建任务记录
    const job = await this.scheduleQueue.add(
      'generate-schedule',
      {
        userId,
        ...jobData,
      },
      {
        attempts: 3, // 失败重试3次
        backoff: {
          type: 'exponential',
          delay: 5000, // 初始延迟5秒
        },
        removeOnComplete: false, // 保留完成的任务
        removeOnFail: false, // 保留失败的任务
      }
    );

    this.logger.log(`异步排班任务已提交: ${job.id}`);

    return {
      success: true,
      jobId: job.id,
      message: '排班任务已提交，正在后台处理...',
    };
  }

  /**
   * 获取任务状态
   */
  async getJobStatus(jobId: string) {
    const job = await this.scheduleQueue.getJob(jobId);

    if (!job) {
      return {
        success: false,
        message: '任务不存在',
      };
    }

    const state = await job.getState();
    const progress = job.progress;

    return {
      success: true,
      jobId: job.id,
      state, // waiting, active, completed, failed
      progress, // 0-100
      data: job.data,
      result: job.returnvalue,
      failedReason: job.failedReason,
      attemptsMade: job.attemptsMade,
    };
  }

  /**
   * 取消任务
   */
  async cancelJob(jobId: string) {
    const job = await this.scheduleQueue.getJob(jobId);

    if (!job) {
      return {
        success: false,
        message: '任务不存在',
      };
    }

    await job.remove();

    this.logger.log(`任务已取消: ${jobId}`);

    return {
      success: true,
      message: '任务已取消',
    };
  }

  /**
   * 获取用户的所有任务
   */
  async getUserJobs(userId: string, limit: number = 10) {
    const jobs = await this.scheduleQueue.getJobs(['waiting', 'active', 'completed', 'failed'], 0, limit);

    const userJobs = jobs.filter(job => job.data.userId === userId);

    return {
      success: true,
      jobs: await Promise.all(
        userJobs.map(async job => ({
          jobId: job.id,
          state: await job.getState(),
          progress: job.progress,
          data: job.data,
          createdAt: new Date(job.timestamp).toISOString(),
        }))
      ),
    };
  }

  /**
   * 通知用户任务完成
   */
  async notifyJobComplete(userId: string, jobId: string, result: any) {
    // 发送实时通知
    this.realtimeService.sendToUser(userId, 'schedule:job:complete', {
      jobId,
      result,
    });

    // 创建站内消息
    await this.prisma.sys_message.create({
      data: {
        recipient_id: userId,
        title: '✅ 排班生成完成',
        content: `您的排班任务已完成。共生成 ${result.count} 条排班记录。`,
        message_type: 'NORMAL',
        biz_type: 'SCHEDULE_GENERATION',
        biz_id: jobId,
        route: '/attendance/ai-schedule',
        sender_name: '雷犀 AI 排班助手',
      },
    });

    this.logger.log(`已通知用户 ${userId} 任务完成: ${jobId}`);
  }

  /**
   * 通知用户任务失败
   */
  async notifyJobFailed(userId: string, jobId: string, error: string) {
    // 发送实时通知
    this.realtimeService.sendToUser(userId, 'schedule:job:failed', {
      jobId,
      error,
    });

    // 创建站内消息
    await this.prisma.sys_message.create({
      data: {
        recipient_id: userId,
        title: '❌ 排班生成失败',
        content: `您的排班任务执行失败：${error}`,
        message_type: 'NORMAL',
        biz_type: 'SCHEDULE_GENERATION',
        biz_id: jobId,
        route: '/attendance/ai-schedule',
        sender_name: '雷犀 AI 排班助手',
      },
    });

    this.logger.warn(`已通知用户 ${userId} 任务失败: ${jobId}`);
  }
}
