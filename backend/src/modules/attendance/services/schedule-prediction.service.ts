import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QueryOptimize } from '../../../common/decorators/query-optimize.decorator';
import { Cache } from '../../../common/decorators/cache.decorator';

/**
 * 排班预测服务
 * 基于历史数据进行智能预测
 */
@Injectable()
export class SchedulePredictionService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 生成排班预测（基于历史数据）
   * 优化点：
   * 1. 使用历史数据分析趋势
   * 2. 计算置信度
   * 3. 支持多种预测模型
   */
  @QueryOptimize({ timeout: 8000, slowQueryThreshold: 500 })
  async generatePredictions(
    platformId: string,
    deptId: string,
    startDate: string,
    endDate: string,
    shifts: string[]
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);
    
    // 1. 获取历史排班数据（最近3个月）
    const threeMonthsAgo = new Date(start);
    threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
    
    const historicalSchedules = await this.prisma.attendance_schedule_history.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        is_deleted: 0,
        start_date: { gte: threeMonthsAgo },
      },
      orderBy: { applied_at: 'desc' },
      take: 20, // 最多取20条历史记录
    });

    // 2. 获取历史人力需求数据
    const historicalDemands = await this.prisma.attendance_staffing_demand.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        is_deleted: 0,
        date: { gte: threeMonthsAgo },
      },
    });

    // 3. 按班次和星期几统计历史需求
    const demandStats = this.analyzeHistoricalDemands(historicalDemands);
    
    // 4. 生成预测数据
    const predictions = [];
    const dates = this.getDaysInBetween(start, end);
    
    for (const date of dates) {
      const dayOfWeek = date.getDay();
      
      for (const shiftName of shifts) {
        const prediction = this.predictDemand(
          date,
          shiftName,
          dayOfWeek,
          demandStats,
          historicalSchedules
        );
        
        predictions.push({
          platform_id: platformId,
          dept_id: deptId,
          predict_date: date,
          shift_name: shiftName,
          ...prediction,
        });
      }
    }

    // 5. 批量保存预测结果
    await this.savePredictions(predictions);

    return {
      success: true,
      predictions: predictions.map(p => ({
        date: p.predict_date.toISOString().split('T')[0],
        shift_name: p.shift_name,
        predicted_demand: p.predicted_demand,
        confidence_score: p.confidence_score,
      })),
    };
  }

  /**
   * 分析历史需求数据
   */
  private analyzeHistoricalDemands(demands: any[]) {
    const stats = new Map<string, { total: number; count: number; byDay: Map<number, number[]> }>();
    
    for (const demand of demands) {
      const key = demand.shift_name;
      const dayOfWeek = new Date(demand.date).getDay();
      
      if (!stats.has(key)) {
        stats.set(key, { total: 0, count: 0, byDay: new Map() });
      }
      
      const stat = stats.get(key)!;
      stat.total += demand.required_count;
      stat.count += 1;
      
      if (!stat.byDay.has(dayOfWeek)) {
        stat.byDay.set(dayOfWeek, []);
      }
      stat.byDay.get(dayOfWeek)!.push(demand.required_count);
    }
    
    return stats;
  }

  /**
   * 预测单个日期和班次的人力需求
   * 使用加权平均算法：
   * - 同星期几的历史数据权重更高
   * - 最近的数据权重更高
   */
  private predictDemand(
    date: Date,
    shiftName: string,
    dayOfWeek: number,
    demandStats: Map<string, any>,
    historicalSchedules: any[]
  ) {
    const stat = demandStats.get(shiftName);
    
    if (!stat || stat.count === 0) {
      // 没有历史数据，返回默认值
      return {
        predicted_demand: 3,
        confidence_score: 20,
        based_on_history_count: 0,
        avg_historical_demand: null,
        trend_factor: null,
        prediction_model: 'default',
        prediction_params: { reason: 'no_historical_data' },
      };
    }

    // 计算同星期几的平均需求
    const sameDayDemands = stat.byDay.get(dayOfWeek) || [];
    const sameDayAvg = sameDayDemands.length > 0
      ? sameDayDemands.reduce((a, b) => a + b, 0) / sameDayDemands.length
      : stat.total / stat.count;

    // 计算整体平均需求
    const overallAvg = stat.total / stat.count;

    // 计算趋势因子（最近的数据是否呈上升或下降趋势）
    const trendFactor = this.calculateTrendFactor(sameDayDemands);

    // 应用趋势调整
    let predictedDemand = Math.round(sameDayAvg * (1 + trendFactor / 100));
    
    // 确保预测值在合理范围内
    predictedDemand = Math.max(1, Math.min(predictedDemand, 20));

    // 计算置信度（基于历史数据量和数据稳定性）
    const confidence = this.calculateConfidence(sameDayDemands, stat.count);

    return {
      predicted_demand: predictedDemand,
      confidence_score: confidence,
      based_on_history_count: sameDayDemands.length,
      avg_historical_demand: Math.round(sameDayAvg * 100) / 100,
      trend_factor: Math.round(trendFactor * 100) / 100,
      prediction_model: 'weighted_average',
      prediction_params: {
        same_day_count: sameDayDemands.length,
        overall_avg: Math.round(overallAvg * 100) / 100,
      },
    };
  }

  /**
   * 计算趋势因子
   * 返回值：-20 到 +20 之间的百分比
   */
  private calculateTrendFactor(demands: number[]): number {
    if (demands.length < 3) return 0;

    // 取最近的数据进行趋势分析
    const recent = demands.slice(-5);
    const older = demands.slice(0, Math.max(1, demands.length - 5));

    const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
    const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;

    if (olderAvg === 0) return 0;

    const change = ((recentAvg - olderAvg) / olderAvg) * 100;
    
    // 限制在 -20% 到 +20% 之间
    return Math.max(-20, Math.min(20, change));
  }

  /**
   * 计算置信度
   * 基于：
   * 1. 历史数据量（数据越多，置信度越高）
   * 2. 数据稳定性（方差越小，置信度越高）
   */
  private calculateConfidence(demands: number[], totalCount: number): number {
    if (demands.length === 0) return 20;

    // 基础置信度（基于数据量）
    let confidence = Math.min(50, demands.length * 10);

    // 计算标准差
    if (demands.length > 1) {
      const avg = demands.reduce((a, b) => a + b, 0) / demands.length;
      const variance = demands.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / demands.length;
      const stdDev = Math.sqrt(variance);
      
      // 变异系数（标准差/平均值）
      const cv = avg > 0 ? stdDev / avg : 1;
      
      // 数据越稳定，置信度越高
      const stabilityScore = Math.max(0, 50 - cv * 50);
      confidence += stabilityScore;
    }

    return Math.round(Math.min(100, confidence));
  }

  /**
   * 批量保存预测结果
   */
  private async savePredictions(predictions: any[]) {
    // 使用 upsert 避免重复插入
    for (const pred of predictions) {
      await this.prisma.attendance_schedule_prediction.upsert({
        where: {
          unique_prediction: {
            dept_id: pred.dept_id,
            predict_date: pred.predict_date,
            shift_name: pred.shift_name,
            is_deleted: 0,
          },
        },
        create: pred,
        update: {
          predicted_demand: pred.predicted_demand,
          confidence_score: pred.confidence_score,
          based_on_history_count: pred.based_on_history_count,
          avg_historical_demand: pred.avg_historical_demand,
          trend_factor: pred.trend_factor,
          prediction_model: pred.prediction_model,
          prediction_params: pred.prediction_params,
        },
      });
    }
  }

  /**
   * 获取预测数据（带缓存）
   */
  @Cache({ ttl: 600, byParams: true, prefix: 'schedule-prediction' })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async getPredictions(
    platformId: string,
    deptId: string,
    startDate: string,
    endDate: string
  ) {
    const start = new Date(startDate);
    const end = new Date(endDate);

    const predictions = await this.prisma.attendance_schedule_prediction.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        predict_date: { gte: start, lte: end },
        is_deleted: 0,
      },
      orderBy: [{ predict_date: 'asc' }, { shift_name: 'asc' }],
    });

    return predictions.map(p => ({
      date: p.predict_date.toISOString().split('T')[0],
      shift_name: p.shift_name,
      predicted_demand: p.predicted_demand,
      confidence_score: Number(p.confidence_score),
      based_on_history_count: p.based_on_history_count,
      avg_historical_demand: p.avg_historical_demand ? Number(p.avg_historical_demand) : null,
      trend_factor: p.trend_factor ? Number(p.trend_factor) : null,
      prediction_model: p.prediction_model,
    }));
  }

  /**
   * 更新预测准确率（在实际应用后回填）
   */
  async updatePredictionAccuracy(
    deptId: string,
    date: string,
    shiftName: string,
    actualDemand: number
  ) {
    const prediction = await this.prisma.attendance_schedule_prediction.findFirst({
      where: {
        dept_id: deptId,
        predict_date: new Date(date),
        shift_name: shiftName,
        is_deleted: 0,
      },
    });

    if (!prediction) return;

    const accuracyRate = prediction.predicted_demand > 0
      ? Math.round((1 - Math.abs(actualDemand - prediction.predicted_demand) / prediction.predicted_demand) * 100)
      : 0;

    await this.prisma.attendance_schedule_prediction.update({
      where: { id: prediction.id },
      data: {
        actual_demand: actualDemand,
        accuracy_rate: Math.max(0, accuracyRate),
      },
    });
  }

  private getDaysInBetween(start: Date, end: Date): Date[] {
    const days: Date[] = [];
    const current = new Date(start);
    while (current <= end) {
      days.push(new Date(current));
      current.setDate(current.getDate() + 1);
    }
    return days;
  }
}
