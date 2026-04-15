import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';

/**
 * 机器学习预测服务 (V4.0 长期优化)
 * 
 * 功能：
 * 1. 时间序列预测（简化版ARIMA）
 * 2. 考虑季节性因素
 * 3. 考虑节假日影响
 * 4. 模型训练和评估
 * 
 * 注意：这是简化版实现，生产环境建议使用专业ML库（如TensorFlow.js、brain.js）
 */
@Injectable()
export class ScheduleMlService {
  private readonly logger = new Logger(ScheduleMlService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * 预测未来人力需求（基于历史数据）
   */
  async predictDemand(
    platformId: string,
    deptId: string,
    shiftName: string,
    predictDate: string
  ) {
    this.logger.log(`ML预测人力需求: 部门=${deptId}, 班次=${shiftName}, 日期=${predictDate}`);

    // 1. 获取历史数据（最近90天）
    const ninetyDaysAgo = new Date();
    ninetyDaysAgo.setDate(ninetyDaysAgo.getDate() - 90);

    const historicalDemands = await this.prisma.attendance_staffing_demand.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        shift_name: shiftName,
        date: { gte: ninetyDaysAgo },
        is_deleted: 0,
      },
      orderBy: { date: 'asc' },
    });

    if (historicalDemands.length < 7) {
      return {
        success: false,
        message: '历史数据不足，至少需要7天的数据',
      };
    }

    // 2. 提取时间序列
    const timeSeries = historicalDemands.map(d => d.required_count);

    // 3. 简单移动平均预测
    const prediction = this.simpleMovingAverage(timeSeries, 7);

    // 4. 考虑季节性因素
    const targetDate = new Date(predictDate);
    const seasonalFactor = this.calculateSeasonalFactor(targetDate, historicalDemands);
    const adjustedPrediction = Math.round(prediction * seasonalFactor);

    // 5. 考虑节假日影响
    const holidayFactor = this.calculateHolidayFactor(targetDate);
    const finalPrediction = Math.round(adjustedPrediction * holidayFactor);

    // 6. 计算置信度
    const confidence = this.calculatePredictionConfidence(timeSeries);

    return {
      success: true,
      prediction: finalPrediction,
      confidence,
      factors: {
        base: prediction,
        seasonal: seasonalFactor,
        holiday: holidayFactor,
      },
      model: 'simple_moving_average',
      historicalDataPoints: timeSeries.length,
    };
  }

  /**
   * 批量预测
   */
  async batchPredict(
    platformId: string,
    deptId: string,
    startDate: string,
    endDate: string
  ) {
    this.logger.log(`批量ML预测: 部门=${deptId}, 周期=${startDate}~${endDate}`);

    // 获取所有班次
    const shifts = await this.prisma.attendance_rule.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        is_deleted: 0,
        status: 1,
      },
      select: { name: true },
    });

    const predictions = [];
    const start = new Date(startDate);
    const end = new Date(endDate);

    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      const dateStr = d.toISOString().split('T')[0];

      for (const shift of shifts) {
        const prediction = await this.predictDemand(
          platformId,
          deptId,
          shift.name,
          dateStr
        );

        if (prediction.success) {
          predictions.push({
            date: dateStr,
            shift_name: shift.name,
            predicted_demand: prediction.prediction,
            confidence: prediction.confidence,
          });
        }
      }
    }

    return {
      success: true,
      predictions,
      total: predictions.length,
    };
  }

  /**
   * 训练模型（保存模型参数）
   */
  async trainModel(
    platformId: string,
    deptId: string,
    shiftName: string
  ) {
    this.logger.log(`训练ML模型: 部门=${deptId}, 班次=${shiftName}`);

    // 获取历史数据
    const sixMonthsAgo = new Date();
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

    const historicalDemands = await this.prisma.attendance_staffing_demand.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        shift_name: shiftName,
        date: { gte: sixMonthsAgo },
        is_deleted: 0,
      },
      orderBy: { date: 'asc' },
    });

    if (historicalDemands.length < 30) {
      return {
        success: false,
        message: '历史数据不足，至少需要30天的数据',
      };
    }

    // 计算模型参数
    const timeSeries = historicalDemands.map(d => d.required_count);
    const mean = timeSeries.reduce((a, b) => a + b, 0) / timeSeries.length;
    const variance = timeSeries.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / timeSeries.length;
    const stdDev = Math.sqrt(variance);

    // 计算季节性参数
    const seasonalParams = this.calculateSeasonalParams(historicalDemands);

    // 保存模型参数（可以存储到数据库或配置中）
    const modelParams = {
      model_type: 'simple_moving_average',
      window_size: 7,
      mean,
      variance,
      stdDev,
      seasonal_params: seasonalParams,
      trained_at: new Date().toISOString(),
      data_points: timeSeries.length,
    };

    return {
      success: true,
      model: modelParams,
      message: '模型训练完成',
    };
  }

  /**
   * 评估模型准确率
   */
  async evaluateModel(
    platformId: string,
    deptId: string,
    shiftName: string
  ) {
    this.logger.log(`评估ML模型: 部门=${deptId}, 班次=${shiftName}`);

    // 获取最近30天的预测和实际数据
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const predictions = await this.prisma.attendance_schedule_prediction.findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        shift_name: shiftName,
        predict_date: { gte: thirtyDaysAgo },
        actual_demand: { not: null },
        is_deleted: 0,
      },
    });

    if (predictions.length === 0) {
      return {
        success: false,
        message: '没有可评估的预测数据',
      };
    }

    // 计算准确率
    let totalError = 0;
    let totalAbsError = 0;
    let correctPredictions = 0;

    for (const pred of predictions) {
      const error = pred.actual_demand! - pred.predicted_demand;
      const absError = Math.abs(error);
      
      totalError += error;
      totalAbsError += absError;

      // 允许±1的误差
      if (absError <= 1) {
        correctPredictions++;
      }
    }

    const avgError = totalError / predictions.length;
    const avgAbsError = totalAbsError / predictions.length;
    const accuracy = (correctPredictions / predictions.length) * 100;

    return {
      success: true,
      evaluation: {
        total_predictions: predictions.length,
        accuracy: Math.round(accuracy * 100) / 100,
        avg_error: Math.round(avgError * 100) / 100,
        avg_abs_error: Math.round(avgAbsError * 100) / 100,
        correct_predictions: correctPredictions,
      },
    };
  }

  /**
   * 简单移动平均
   */
  private simpleMovingAverage(timeSeries: number[], windowSize: number): number {
    if (timeSeries.length < windowSize) {
      return timeSeries.reduce((a, b) => a + b, 0) / timeSeries.length;
    }

    const recentData = timeSeries.slice(-windowSize);
    return recentData.reduce((a, b) => a + b, 0) / windowSize;
  }

  /**
   * 计算季节性因子
   */
  private calculateSeasonalFactor(targetDate: Date, historicalDemands: any[]): number {
    const dayOfWeek = targetDate.getDay();
    
    // 按星期几分组
    const weekdayDemands = new Map<number, number[]>();
    for (const demand of historicalDemands) {
      const dow = new Date(demand.date).getDay();
      if (!weekdayDemands.has(dow)) {
        weekdayDemands.set(dow, []);
      }
      weekdayDemands.get(dow)!.push(demand.required_count);
    }

    // 计算目标星期几的平均需求
    const targetDayDemands = weekdayDemands.get(dayOfWeek) || [];
    if (targetDayDemands.length === 0) return 1.0;

    const targetDayAvg = targetDayDemands.reduce((a, b) => a + b, 0) / targetDayDemands.length;

    // 计算整体平均需求
    const allDemands = historicalDemands.map(d => d.required_count);
    const overallAvg = allDemands.reduce((a, b) => a + b, 0) / allDemands.length;

    // 季节性因子 = 目标星期几平均 / 整体平均
    return overallAvg > 0 ? targetDayAvg / overallAvg : 1.0;
  }

  /**
   * 计算节假日因子
   */
  private calculateHolidayFactor(targetDate: Date): number {
    const dayOfWeek = targetDate.getDay();
    
    // 周末需求通常更高
    if (dayOfWeek === 0 || dayOfWeek === 6) {
      return 1.2; // 增加20%
    }

    // TODO: 可以添加更复杂的节假日判断逻辑
    // 例如：春节、国庆等法定节假日

    return 1.0;
  }

  /**
   * 计算预测置信度
   */
  private calculatePredictionConfidence(timeSeries: number[]): number {
    if (timeSeries.length < 7) return 30;
    if (timeSeries.length < 14) return 50;
    if (timeSeries.length < 30) return 70;
    if (timeSeries.length < 60) return 85;
    return 95;
  }

  /**
   * 计算季节性参数
   */
  private calculateSeasonalParams(historicalDemands: any[]) {
    const weekdayAvg = new Map<number, number>();

    for (let dow = 0; dow < 7; dow++) {
      const dayDemands = historicalDemands
        .filter(d => new Date(d.date).getDay() === dow)
        .map(d => d.required_count);

      if (dayDemands.length > 0) {
        weekdayAvg.set(dow, dayDemands.reduce((a, b) => a + b, 0) / dayDemands.length);
      }
    }

    return Object.fromEntries(weekdayAvg);
  }
}
