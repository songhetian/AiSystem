import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { Cache } from '../../../common/decorators/cache.decorator';

/**
 * AI推荐服务 (V4.0 中期优化)
 * 
 * 功能：
 * 1. 基于历史数据分析最优配置
 * 2. 智能推荐排班参数
 * 3. 自动优化配置
 * 4. 生成推荐报告
 */
@Injectable()
export class ScheduleRecommendationService {
  private readonly logger = new Logger(ScheduleRecommendationService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 生成排班配置推荐
   */
  @Cache({ ttl: 1800, byParams: true, prefix: 'schedule-recommendation' })
  async generateRecommendations(
    platformId: string,
    deptId: string,
    startDate: string,
    endDate: string
  ) {
    this.logger.log(`生成排班推荐: 部门=${deptId}, 周期=${startDate}~${endDate}`);

    // 1. 分析历史数据
    const historicalData = await this.analyzeHistoricalData(platformId, deptId);

    // 2. 生成参数推荐
    const paramRecommendations = this.generateParamRecommendations(historicalData);

    // 3. 生成班次推荐
    const shiftRecommendations = await this.generateShiftRecommendations(platformId, deptId, historicalData);

    // 4. 生成人力需求推荐
    const demandRecommendations = await this.generateDemandRecommendations(platformId, deptId, startDate, endDate);

    // 5. 计算推荐置信度
    const confidence = this.calculateConfidence(historicalData);

    return {
      success: true,
      confidence,
      recommendations: {
        params: paramRecommendations,
        shifts: shiftRecommendations,
        demands: demandRecommendations,
      },
      analysis: {
        historicalRecords: historicalData.totalRecords,
        avgComplianceRate: historicalData.avgComplianceRate,
        avgSatisfactionRate: historicalData.avgSatisfactionRate,
        avgFittingRate: historicalData.avgFittingRate,
      },
    };
  }

  /**
   * 自动优化配置
   */
  async autoOptimizeConfig(
    platformId: string,
    deptId: string,
    currentConfig: any
  ) {
    this.logger.log(`自动优化配置: 部门=${deptId}`);

    const recommendations = await this.generateRecommendations(
      platformId,
      deptId,
      new Date().toISOString().split('T')[0],
      new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]
    );

    // 合并当前配置和推荐配置
    const optimizedConfig = {
      ...currentConfig,
      ...recommendations.recommendations.params,
      _optimized: true,
      _confidence: recommendations.confidence,
      _timestamp: new Date().toISOString(),
    };

    return {
      success: true,
      originalConfig: currentConfig,
      optimizedConfig,
      improvements: this.calculateImprovements(currentConfig, optimizedConfig),
      confidence: recommendations.confidence,
    };
  }

  /**
   * 分析历史数据
   */
  private async analyzeHistoricalData(platformId: string, deptId: string) {
    // 获取最近30天的历史记录
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const histories = await this.prisma.attendance_schedule_history.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        applied_at: { gte: thirtyDaysAgo },
        is_deleted: 0,
      },
      orderBy: { applied_at: 'desc' },
    });

    if (histories.length === 0) {
      return {
        totalRecords: 0,
        avgComplianceRate: 0,
        avgSatisfactionRate: 0,
        avgFittingRate: 0,
        bestMode: 'fairness',
        avgWarningCount: 0,
      };
    }

    const totalRecords = histories.length;
    const avgComplianceRate = histories.reduce((sum, h) => sum + h.compliance_rate, 0) / totalRecords;
    const avgSatisfactionRate = histories.reduce((sum, h) => sum + h.satisfaction_rate, 0) / totalRecords;
    const avgFittingRate = histories.reduce((sum, h) => sum + h.fitting_rate, 0) / totalRecords;
    const avgWarningCount = histories.reduce((sum, h) => sum + h.warning_count, 0) / totalRecords;

    // 找出最佳模式
    const modeStats = new Map<string, { count: number; avgCompliance: number }>();
    for (const h of histories) {
      if (!modeStats.has(h.mode)) {
        modeStats.set(h.mode, { count: 0, avgCompliance: 0 });
      }
      const stats = modeStats.get(h.mode)!;
      stats.count++;
      stats.avgCompliance += h.compliance_rate;
    }

    let bestMode = 'fairness';
    let bestCompliance = 0;
    for (const [mode, stats] of modeStats.entries()) {
      const avgCompliance = stats.avgCompliance / stats.count;
      if (avgCompliance > bestCompliance) {
        bestCompliance = avgCompliance;
        bestMode = mode;
      }
    }

    return {
      totalRecords,
      avgComplianceRate,
      avgSatisfactionRate,
      avgFittingRate,
      avgWarningCount,
      bestMode,
      histories,
    };
  }

  /**
   * 生成参数推荐
   */
  private generateParamRecommendations(historicalData: any) {
    const recommendations: any = {
      priority: historicalData.bestMode,
      max_consecutive_days: 6,
      max_hours_per_week: 40,
      daily_max_hours: 8,
      min_staff_per_shift: 1,
    };

    // 基于历史数据调整参数
    if (historicalData.avgWarningCount > 10) {
      // 警告较多，放宽限制
      recommendations.max_consecutive_days = 7;
      recommendations.max_hours_per_week = 44;
      recommendations._reason = '历史数据显示警告较多，建议放宽限制';
    } else if (historicalData.avgWarningCount < 3) {
      // 警告较少，可以收紧限制
      recommendations.max_consecutive_days = 5;
      recommendations.max_hours_per_week = 36;
      recommendations._reason = '历史数据显示警告较少，可以收紧限制以提高员工满意度';
    }

    if (historicalData.avgComplianceRate < 80) {
      recommendations._warning = '合规率较低，建议检查排班规则和员工配置';
    }

    return recommendations;
  }

  /**
   * 生成班次推荐
   */
  private async generateShiftRecommendations(platformId: string, deptId: string, historicalData: any) {
    // 获取当前班次
    const shifts = await this.prisma.attendance_rule.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        is_deleted: 0,
        status: 1,
      },
    });

    // 分析班次使用频率
    const shiftUsage = new Map<string, number>();
    for (const history of historicalData.histories || []) {
      if (history.schedule_data) {
        for (const item of history.schedule_data) {
          const count = shiftUsage.get(item.shift_name) || 0;
          shiftUsage.set(item.shift_name, count + 1);
        }
      }
    }

    const recommendations = shifts.map(shift => {
      const usage = shiftUsage.get(shift.name) || 0;
      const avgUsage = Array.from(shiftUsage.values()).reduce((a, b) => a + b, 0) / shiftUsage.size;

      return {
        shift_id: shift.id,
        shift_name: shift.name,
        usage_count: usage,
        usage_rate: shiftUsage.size > 0 ? (usage / avgUsage) : 0,
        recommendation: usage > avgUsage * 1.5 ? 'high_demand' : usage < avgUsage * 0.5 ? 'low_demand' : 'normal',
      };
    });

    return recommendations;
  }

  /**
   * 生成人力需求推荐
   */
  private async generateDemandRecommendations(
    platformId: string,
    deptId: string,
    startDate: string,
    endDate: string
  ) {
    // 获取历史需求数据
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const historicalDemands = await this.prisma.attendance_staffing_demand.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        date: { gte: thirtyDaysAgo },
        is_deleted: 0,
      },
    });

    // 按班次统计平均需求
    const demandStats = new Map<string, { total: number; count: number }>();
    for (const demand of historicalDemands) {
      const key = demand.shift_name;
      if (!demandStats.has(key)) {
        demandStats.set(key, { total: 0, count: 0 });
      }
      const stats = demandStats.get(key)!;
      stats.total += demand.required_count;
      stats.count++;
    }

    // 生成推荐
    const recommendations = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];
      const dayOfWeek = d.getDay();

      for (const [shiftName, stats] of demandStats.entries()) {
        const avgDemand = Math.round(stats.total / stats.count);
        
        // 周末需求可能不同
        const adjustedDemand = (dayOfWeek === 0 || dayOfWeek === 6)
          ? Math.round(avgDemand * 1.2) // 周末增加20%
          : avgDemand;

        recommendations.push({
          date: dateStr,
          shift_name: shiftName,
          recommended_count: adjustedDemand,
          confidence: stats.count >= 4 ? 'high' : stats.count >= 2 ? 'medium' : 'low',
        });
      }
    }

    return recommendations;
  }

  /**
   * 计算推荐置信度
   */
  private calculateConfidence(historicalData: any): number {
    if (historicalData.totalRecords === 0) return 0;
    if (historicalData.totalRecords < 5) return 30;
    if (historicalData.totalRecords < 10) return 60;
    if (historicalData.totalRecords < 20) return 80;
    return 95;
  }

  /**
   * 计算改进效果
   */
  private calculateImprovements(originalConfig: any, optimizedConfig: any) {
    const improvements = [];

    if (optimizedConfig.max_consecutive_days !== originalConfig.max_consecutive_days) {
      improvements.push({
        param: 'max_consecutive_days',
        from: originalConfig.max_consecutive_days,
        to: optimizedConfig.max_consecutive_days,
        impact: '调整连续工作天数限制，平衡员工休息和排班灵活性',
      });
    }

    if (optimizedConfig.max_hours_per_week !== originalConfig.max_hours_per_week) {
      improvements.push({
        param: 'max_hours_per_week',
        from: originalConfig.max_hours_per_week,
        to: optimizedConfig.max_hours_per_week,
        impact: '调整周工时限制，优化工作负荷分配',
      });
    }

    if (optimizedConfig.priority !== originalConfig.priority) {
      improvements.push({
        param: 'priority',
        from: originalConfig.priority,
        to: optimizedConfig.priority,
        impact: '切换排班策略，提高整体合规率',
      });
    }

    return improvements;
  }
}
