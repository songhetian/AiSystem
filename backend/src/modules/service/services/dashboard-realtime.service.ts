import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { RealtimeService } from '../../../common/services/realtime.service';
import { RedisService } from '../../../common/services/redis.service';
import { Cron, CronExpression } from '@nestjs/schedule';

@Injectable()
export class DashboardRealtimeService implements OnModuleInit {
  private readonly logger = new Logger(DashboardRealtimeService.name);
  private isRunning = false;

  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService,
    private readonly redisService: RedisService,
  ) {}

  onModuleInit() {
    this.logger.log('Dashboard realtime service initialized');
  }

  /**
   * 定时推送大屏数据 - 每30秒执行一次
   */
  @Cron('*/30 * * * * *')
  async pushDashboardMetrics() {
    if (this.isRunning) {
      this.logger.debug('Previous push still running, skipping...');
      return;
    }

    this.isRunning = true;
    
    try {
      const startTime = Date.now();
      const metrics = await this.calculateMetrics();
      const duration = Date.now() - startTime;
      
      // 推送到所有订阅大屏的客户端
      this.realtimeService.emitToRoom(
        'dashboard:metrics',
        'dashboard.metrics.updated',
        {
          timestamp: new Date().toISOString(),
          data: metrics,
          performance: {
            calculationTime: duration,
          },
        }
      );

      this.logger.debug(`Dashboard metrics pushed in ${duration}ms`);
    } catch (error) {
      this.logger.error('Failed to push dashboard metrics:', error);
    } finally {
      this.isRunning = false;
    }
  }

  /**
   * 手动触发数据推送
   */
  async triggerPush(): Promise<any> {
    const metrics = await this.calculateMetrics();
    
    this.realtimeService.emitToRoom(
      'dashboard:metrics',
      'dashboard.metrics.updated',
      {
        timestamp: new Date().toISOString(),
        data: metrics,
        triggered: 'manual',
      }
    );

    return metrics;
  }

  /**
   * 计算所有大屏指标
   */
  private async calculateMetrics() {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    
    // 并行查询所有指标以提高性能
    const [
      totalSessions,
      todaySessions,
      lossSessionCount,
      qualityStats,
      sensitiveHitCount,
      riskDistribution,
      topFaqs,
      trends,
      realTimeStats,
      yesterdayStats
    ] = await Promise.all([
      this.getTotalSessions(),
      this.getTodaySessions(today),
      this.getLossSessionCount(today),
      this.getQualityStats(today),
      this.getSensitiveHitCount(today),
      this.getRiskDistribution(today),
      this.getTopFaqs(today),
      this.getTrends(today),
      this.getRealTimeStats(),
      this.getYesterdayStats(yesterday, today)
    ]);

    return {
      // 核心指标
      totalSessions,
      todaySessions,
      lossSessionCount,
      qualityPassRate: qualityStats.passRate,
      sensitiveHitCount,
      
      // 分布数据
      riskBuckets: riskDistribution,
      topFaqs,
      
      // 趋势数据
      trends,
      
      // 实时统计
      realTimeStats,
      
      // 同比数据
      comparison: {
        sessionsGrowth: this.calculateGrowth(todaySessions, yesterdayStats.sessions),
        qualityGrowth: this.calculateGrowth(qualityStats.passRate, yesterdayStats.qualityPassRate),
        lossGrowth: this.calculateGrowth(lossSessionCount, yesterdayStats.lossCount),
      },
      
      // 元数据
      lastUpdate: now.toISOString(),
      dataSource: 'realtime',
    };
  }

  /**
   * 获取总会话数
   */
  private async getTotalSessions(): Promise<number> {
    const cacheKey = 'dashboard:total_sessions';
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return parseInt(cached, 10);
    }

    const count = await this.prisma.service_session.count({
      where: { is_deleted: 0 }
    });

    // 缓存5分钟
    await this.redisService.set(cacheKey, count.toString(), 300);
    return count;
  }

  /**
   * 获取今日会话数
   */
  private async getTodaySessions(today: Date): Promise<number> {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    return await this.prisma.service_session.count({
      where: {
        started_at: {
          gte: today,
          lt: tomorrow,
        },
        is_deleted: 0,
      },
    });
  }

  /**
   * 获取流失会话数
   */
  private async getLossSessionCount(today: Date): Promise<number> {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 查询今日高风险流失会话
    const analysisCount = await this.prisma.service_session_analysis.count({
      where: {
        create_time: {
          gte: today,
          lt: tomorrow,
        },
        loss_risk_level: 'high',
        is_deleted: 0,
      },
    });

    return analysisCount;
  }

  /**
   * 获取质检统计
   */
  private async getQualityStats(today: Date): Promise<{ passRate: number; totalChecked: number }> {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const [totalChecked, passedCount] = await Promise.all([
      this.prisma.service_quality_record.count({
        where: {
          inspected_at: {
            gte: today,
            lt: tomorrow,
          },
          is_deleted: 0,
        },
      }),
      this.prisma.service_quality_record.count({
        where: {
          inspected_at: {
            gte: today,
            lt: tomorrow,
          },
          passed: 1,
          is_deleted: 0,
        },
      }),
    ]);

    const passRate = totalChecked > 0 ? Math.round((passedCount / totalChecked) * 100) : 0;
    
    return { passRate, totalChecked };
  }

  /**
   * 获取敏感词拦截数
   */
  private async getSensitiveHitCount(today: Date): Promise<number> {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    // 统计今日敏感词命中总数
    const analyses = await this.prisma.service_session_analysis.findMany({
      where: {
        create_time: {
          gte: today,
          lt: tomorrow,
        },
        is_deleted: 0,
      },
      select: {
        sensitive_hit_count: true,
      },
    });

    return analyses.reduce((sum, analysis) => sum + (analysis.sensitive_hit_count || 0), 0);
  }

  /**
   * 获取风险分布
   */
  private async getRiskDistribution(today: Date): Promise<{ high: number; medium: number; low: number }> {
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);

    const riskCounts = await this.prisma.service_session_analysis.groupBy({
      by: ['loss_risk_level'],
      where: {
        create_time: {
          gte: today,
          lt: tomorrow,
        },
        is_deleted: 0,
      },
      _count: {
        id: true,
      },
    });

    const distribution = { high: 0, medium: 0, low: 0 };
    
    riskCounts.forEach(item => {
      if (item.loss_risk_level === 'high') {
        distribution.high = item._count.id;
      } else if (item.loss_risk_level === 'medium') {
        distribution.medium = item._count.id;
      } else if (item.loss_risk_level === 'low') {
        distribution.low = item._count.id;
      }
    });

    return distribution;
  }

  /**
   * 获取TOP高频问题
   */
  private async getTopFaqs(today: Date): Promise<Array<{ question: string; count: number }>> {
    const cacheKey = `dashboard:top_faqs:${today.toISOString().split('T')[0]}`;
    const cached = await this.redisService.get(cacheKey);
    
    if (cached) {
      return JSON.parse(cached);
    }

    // 从FAQ映射表获取高频问题
    const topFaqs = await this.prisma.service_faq_mapping.findMany({
      where: {
        is_deleted: 0,
      },
      orderBy: {
        hit_count: 'desc',
      },
      take: 10,
      select: {
        faq_content: true,
        hit_count: true,
      },
    });

    const result = topFaqs.map(faq => ({
      question: faq.faq_content,
      count: faq.hit_count,
    }));

    // 缓存1小时
    await this.redisService.set(cacheKey, JSON.stringify(result), 3600);
    return result;
  }

  /**
   * 获取趋势数据（最近7天）
   */
  private async getTrends(today: Date): Promise<Array<{ date: string; sessions: number; quality: number }>> {
    const sevenDaysAgo = new Date(today);
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

    // 获取每日会话数
    const dailySessions = await this.prisma.$queryRaw<Array<{ date: string; sessions: number }>>`
      SELECT 
        DATE(started_at) as date,
        COUNT(*) as sessions
      FROM service_session 
      WHERE started_at >= ${sevenDaysAgo}
        AND started_at < ${today}
        AND is_deleted = 0
      GROUP BY DATE(started_at)
      ORDER BY date ASC
    `;

    // 获取每日质检合格率
    const dailyQuality = await this.prisma.$queryRaw<Array<{ date: string; total: number; passed: number }>>`
      SELECT 
        DATE(inspected_at) as date,
        COUNT(*) as total,
        SUM(passed) as passed
      FROM service_quality_record 
      WHERE inspected_at >= ${sevenDaysAgo}
        AND inspected_at < ${today}
        AND is_deleted = 0
      GROUP BY DATE(inspected_at)
      ORDER BY date ASC
    `;

    // 合并数据
    const trends = [];
    for (let i = 6; i >= 0; i--) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      const dateStr = date.toISOString().split('T')[0];

      const sessionData = dailySessions.find(d => d.date === dateStr);
      const qualityData = dailyQuality.find(d => d.date === dateStr);

      trends.push({
        date: dateStr,
        sessions: sessionData ? Number(sessionData.sessions) : 0,
        quality: qualityData && qualityData.total > 0 
          ? Math.round((Number(qualityData.passed) / Number(qualityData.total)) * 100)
          : 0,
      });
    }

    return trends;
  }

  /**
   * 获取实时统计
   */
  private async getRealTimeStats(): Promise<{
    currentHourSessions: number;
    onlineAgents: number;
    avgResponseTime: number;
  }> {
    const now = new Date();
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);

    const [currentHourSessions, avgResponseTime] = await Promise.all([
      this.prisma.service_session.count({
        where: {
          started_at: {
            gte: oneHourAgo,
          },
          is_deleted: 0,
        },
      }),
      this.getAvgResponseTime(oneHourAgo),
    ]);

    // 在线坐席数（模拟数据，实际应该从用户在线状态获取）
    const onlineAgents = await this.getOnlineAgentsCount();

    return {
      currentHourSessions,
      onlineAgents,
      avgResponseTime,
    };
  }

  /**
   * 获取昨日统计数据
   */
  private async getYesterdayStats(yesterday: Date, today: Date): Promise<{
    sessions: number;
    qualityPassRate: number;
    lossCount: number;
  }> {
    const [sessions, qualityStats, lossCount] = await Promise.all([
      this.getTodaySessions(yesterday),
      this.getQualityStats(yesterday),
      this.getLossSessionCount(yesterday),
    ]);

    return {
      sessions,
      qualityPassRate: qualityStats.passRate,
      lossCount,
    };
  }

  /**
   * 获取平均响应时间
   */
  private async getAvgResponseTime(since: Date): Promise<number> {
    const sessions = await this.prisma.service_session.findMany({
      where: {
        started_at: {
          gte: since,
        },
        response_duration_sec: {
          not: null,
        },
        is_deleted: 0,
      },
      select: {
        response_duration_sec: true,
      },
    });

    if (sessions.length === 0) return 0;

    const totalTime = sessions.reduce((sum, session) => sum + (session.response_duration_sec || 0), 0);
    return Math.round(totalTime / sessions.length);
  }

  /**
   * 获取在线坐席数（模拟实现）
   */
  private async getOnlineAgentsCount(): Promise<number> {
    // 实际实现应该查询用户在线状态
    // 这里返回模拟数据
    const activeUsers = await this.redisService.keys('user:online:*');
    return activeUsers.length;
  }

  /**
   * 计算增长率
   */
  private calculateGrowth(current: number, previous: number): number {
    if (previous === 0) return current > 0 ? 100 : 0;
    return Math.round(((current - previous) / previous) * 100);
  }
}