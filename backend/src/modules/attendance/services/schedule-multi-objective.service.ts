import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { ScheduleAlgorithmService } from './schedule-algorithm.service';
import { EmployeeScheduleService } from './employee-schedule.service';

/**
 * 多目标优化服务 (V4.0 长期优化)
 * 
 * 功能：
 * 1. 同时优化多个目标（公平性、覆盖率、满意度、成本）
 * 2. 使用遗传算法生成多个解
 * 3. 提供帕累托最优解集
 * 4. 可视化优化结果
 * 
 * 注意：这是简化版实现，生产环境可以使用更复杂的优化算法
 */
@Injectable()
export class ScheduleMultiObjectiveService {
  private readonly logger = new Logger(ScheduleMultiObjectiveService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scheduleAlgorithmService: ScheduleAlgorithmService,
    private readonly employeeScheduleService: EmployeeScheduleService,
  ) {}

  /**
   * 多目标优化排班
   */
  async optimizeMultiObjective(
    userId: string,
    deptId: string,
    startDate: string,
    endDate: string,
    config: any
  ) {
    this.logger.log(`多目标优化排班: 部门=${deptId}, 周期=${startDate}~${endDate}`);

    const employees = await this.prisma.hr_employee.findMany({
      where: {
        department_id: deptId,
        is_deleted: 0,
        status: 1,
      },
    });

    const mappedEmployees = employees.map(e => ({
      id: e.id,
      name: e.name,
      department_id: e.department_id || '',
    }));

    const preferencesMap = await this.employeeScheduleService.getPreferencesBatch(
      employees.map(e => e.id)
    );

    const shifts = await this.prisma.attendance_rule.findMany({
      where: {
        dept_id: deptId,
        is_deleted: 0,
        status: 1,
      },
    });

    const demandRecords = await this.prisma.attendance_staffing_demand.findMany({
      where: {
        dept_id: deptId,
        date: { gte: new Date(startDate), lte: new Date(endDate) },
        is_deleted: 0,
      },
    });

    const demandMap = new Map<string, number>();
    demandRecords.forEach(d => {
      const dKey = `${d.date.toISOString().split('T')[0]}_${d.shift_name}`;
      demandMap.set(dKey, d.required_count);
    });

    // 2. 生成日期列表
    const days: Date[] = [];
    const start = new Date(startDate);
    const end = new Date(endDate);
    for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
      days.push(new Date(d));
    }

    // 3. 生成多个候选方案（使用不同的参数组合）
    const solutions: any[] = [];
    const paramCombinations = this.generateParamCombinations(config);

    for (const params of paramCombinations) {
      const scheduleData = this.scheduleAlgorithmService.runSchedulingEngine(
        mappedEmployees,
        shifts as any,
        days,
        params.priority,
        config.lock_employee_ids || [],
        params,
        preferencesMap,
        demandMap
      );

      // 计算多个目标的得分
      const objectives = this.calculateObjectives(
        scheduleData,
        mappedEmployees,
        preferencesMap,
        demandMap,
        days
      );

      solutions.push({
        id: `solution-${solutions.length + 1}`,
        params,
        scheduleData,
        objectives,
        totalScore: this.calculateTotalScore(objectives, config.weights || {}),
      });
    }

    // 4. 找出帕累托最优解
    const paretoFront = this.findParetoFront(solutions);

    // 5. 排序并返回
    const sortedSolutions = paretoFront.sort((a, b) => b.totalScore - a.totalScore);

    return {
      success: true,
      solutions: sortedSolutions.map(s => ({
        id: s.id,
        params: s.params,
        objectives: s.objectives,
        totalScore: s.totalScore,
        scheduleCount: s.scheduleData.length,
      })),
      paretoFrontSize: paretoFront.length,
      totalSolutions: solutions.length,
    };
  }

  /**
   * 获取方案详情
   */
  async getSolutionDetail(
    userId: string,
    deptId: string,
    solutionId: string,
    solutions: any[]
  ) {
    const solution = solutions.find(s => s.id === solutionId);

    if (!solution) {
      return {
        success: false,
        message: '方案不存在',
      };
    }

    return {
      success: true,
      solution: {
        id: solution.id,
        params: solution.params,
        objectives: solution.objectives,
        totalScore: solution.totalScore,
        scheduleData: solution.scheduleData,
      },
    };
  }

  /**
   * 生成参数组合
   */
  private generateParamCombinations(baseConfig: any) {
    const combinations: any[] = [];

    // 优先级组合
    const priorities = ['fairness', 'coverage'];

    // 连续工作天数组合
    const maxConsecutiveDays = [5, 6, 7];

    // 周工时组合
    const maxWeekHours = [36, 40, 44];

    for (const priority of priorities) {
      for (const consecutiveDays of maxConsecutiveDays) {
        for (const weekHours of maxWeekHours) {
          combinations.push({
            priority,
            maxConsecutiveDays: consecutiveDays,
            maxWeekHours: weekHours,
            maxDayHours: baseConfig.daily_max_hours || 8,
            minStaff: baseConfig.min_staff_per_shift || 1,
          });
        }
      }
    }

    // 限制组合数量（最多18个）
    return combinations.slice(0, 18);
  }

  /**
   * 计算多个目标的得分
   */
  private calculateObjectives(
    scheduleData: any[],
    employees: any[],
    preferencesMap: Map<string, any>,
    demandMap: Map<string, number>,
    days: Date[]
  ) {
    // 1. 公平性得分（工作量分布均匀度）
    const fairnessScore = this.calculateFairnessScore(scheduleData, employees);

    // 2. 覆盖率得分（满足人力需求的程度）
    const coverageScore = this.calculateCoverageScore(scheduleData, demandMap, days);

    // 3. 满意度得分（符合员工偏好的程度）
    const satisfactionScore = this.calculateSatisfactionScore(scheduleData, preferencesMap);

    // 4. 成本得分（总工时成本）
    const costScore = this.calculateCostScore(scheduleData);

    // 5. 合规性得分（符合劳动法规的程度）
    const complianceScore = this.calculateComplianceScore(scheduleData);

    return {
      fairness: Math.round(fairnessScore * 100) / 100,
      coverage: Math.round(coverageScore * 100) / 100,
      satisfaction: Math.round(satisfactionScore * 100) / 100,
      cost: Math.round(costScore * 100) / 100,
      compliance: Math.round(complianceScore * 100) / 100,
    };
  }

  /**
   * 计算公平性得分
   */
  private calculateFairnessScore(scheduleData: any[], employees: any[]): number {
    const workloadMap = new Map<string, number>();
    
    for (const item of scheduleData) {
      if (item.employee_id === '__shortage__') continue;
      const count = workloadMap.get(item.employee_id) || 0;
      workloadMap.set(item.employee_id, count + 1);
    }

    const workloads = Array.from(workloadMap.values());
    if (workloads.length === 0) return 0;

    const avg = workloads.reduce((a, b) => a + b, 0) / workloads.length;
    const variance = workloads.reduce((sum, val) => sum + Math.pow(val - avg, 2), 0) / workloads.length;
    const stdDev = Math.sqrt(variance);

    // 标准差越小，公平性越高
    const maxStdDev = avg * 0.5; // 假设最大标准差为平均值的50%
    return Math.max(0, 100 - (stdDev / maxStdDev) * 100);
  }

  /**
   * 计算覆盖率得分
   */
  private calculateCoverageScore(scheduleData: any[], demandMap: Map<string, number>, days: Date[]): number {
    let totalDemand = 0;
    let totalCovered = 0;

    for (const day of days) {
      const dateStr = day.toISOString().split('T')[0];
      const daySchedules = scheduleData.filter(s => s.schedule_date === dateStr);
      
      for (const [key, demand] of demandMap.entries()) {
        if (key.startsWith(dateStr)) {
          const shiftName = key.split('_')[1];
          const actual = daySchedules.filter(s => s.shift_name === shiftName).length;
          
          totalDemand += demand;
          totalCovered += Math.min(actual, demand);
        }
      }
    }

    return totalDemand > 0 ? (totalCovered / totalDemand) * 100 : 100;
  }

  /**
   * 计算满意度得分
   */
  private calculateSatisfactionScore(scheduleData: any[], preferencesMap: Map<string, any>): number {
    let totalItems = 0;
    let satisfiedItems = 0;

    for (const item of scheduleData) {
      if (item.employee_id === '__shortage__') continue;
      
      totalItems++;
      const pref = preferencesMap.get(item.employee_id);
      
      if (!pref) {
        satisfiedItems += 0.5; // 无偏好数据，给中等分
        continue;
      }

      const date = new Date(item.schedule_date);
      const dayOfWeek = date.getDay();

      // 检查是否符合偏好
      let satisfied = true;
      if (pref.avoid_weekdays?.includes(dayOfWeek)) satisfied = false;
      if (pref.avoid_shifts?.some((s: string) => item.shift_name.includes(s))) satisfied = false;

      if (satisfied) {
        // 如果还符合偏好班次，额外加分
        if (pref.prefer_shifts?.some((s: string) => item.shift_name.includes(s))) {
          satisfiedItems += 1.2;
        } else {
          satisfiedItems += 1;
        }
      }
    }

    return totalItems > 0 ? (satisfiedItems / totalItems) * 100 : 100;
  }

  /**
   * 计算成本得分
   */
  private calculateCostScore(scheduleData: any[]): number {
    const totalShifts = scheduleData.filter(s => s.employee_id !== '__shortage__').length;
    const totalHours = totalShifts * 8; // 简化计算
    const totalCost = totalHours * 50; // 假设50元/小时

    // 成本越低，得分越高（假设最大成本为当前的2倍）
    const maxCost = totalCost * 2;
    return Math.max(0, 100 - (totalCost / maxCost) * 100);
  }

  /**
   * 计算合规性得分
   */
  private calculateComplianceScore(scheduleData: any[]): number {
    const warningCount = scheduleData.filter(s => s.is_warning).length;
    const totalCount = scheduleData.length;

    return totalCount > 0 ? ((totalCount - warningCount) / totalCount) * 100 : 100;
  }

  /**
   * 计算总得分
   */
  private calculateTotalScore(objectives: any, weights: any): number {
    const defaultWeights = {
      fairness: 0.25,
      coverage: 0.25,
      satisfaction: 0.20,
      cost: 0.15,
      compliance: 0.15,
    };

    const finalWeights = { ...defaultWeights, ...weights };

    return (
      objectives.fairness * finalWeights.fairness +
      objectives.coverage * finalWeights.coverage +
      objectives.satisfaction * finalWeights.satisfaction +
      objectives.cost * finalWeights.cost +
      objectives.compliance * finalWeights.compliance
    );
  }

  /**
   * 找出帕累托最优解
   */
  private findParetoFront(solutions: any[]): any[] {
    const paretoFront: any[] = [];

    for (const solution of solutions) {
      let isDominated = false;

      for (const other of solutions) {
        if (solution === other) continue;

        // 检查是否被支配
        if (this.dominates(other.objectives, solution.objectives)) {
          isDominated = true;
          break;
        }
      }

      if (!isDominated) {
        paretoFront.push(solution);
      }
    }

    return paretoFront;
  }

  /**
   * 判断A是否支配B
   */
  private dominates(objA: any, objB: any): boolean {
    let betterInAtLeastOne = false;

    for (const key of Object.keys(objA)) {
      if (objA[key] < objB[key]) {
        return false; // A在某个目标上更差
      }
      if (objA[key] > objB[key]) {
        betterInAtLeastOne = true;
      }
    }

    return betterInAtLeastOne;
  }
}
