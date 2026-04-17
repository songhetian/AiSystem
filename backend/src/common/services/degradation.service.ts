import { Injectable, Logger, OnModuleDestroy } from "@nestjs/common";
import { RedisService } from "./redis.service";
import { DegradationLevel } from "../decorators/degradation.decorator";
import * as os from "os";

/**
 * 降级服务
 * 监控系统负载，自动触发降级
 */
@Injectable()
export class DegradationService implements OnModuleDestroy {
  private readonly logger = new Logger(DegradationService.name);
  private currentLevel: DegradationLevel = 0; // 0表示正常状态
  private readonly DEGRADATION_KEY = "system:degradation:level";
  private monitoringInterval: NodeJS.Timeout;

  // 降级阈值配置（可通过配置文件调整）
  private readonly thresholds = {
    cpu: {
      light: 85, // CPU使用率85%触发一级降级
      medium: 90, // CPU使用率90%触发二级降级
      heavy: 95, // CPU使用率95%触发三级降级
    },
    memory: {
      light: 80, // 内存使用率80%触发一级降级
      medium: 85, // 内存使用率85%触发二级降级
      heavy: 90, // 内存使用率90%触发三级降级
    },
    duration: 30000, // 持续时间30秒
  };

  constructor(private readonly redisService: RedisService) {
    // 启动监控
    this.startMonitoring();
  }

  /**
   * 清理定时器，防止内存泄漏
   */
  onModuleDestroy() {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
      this.logger.log("Degradation service monitoring interval cleared");
    }
  }

  /**
   * 获取当前降级级别
   */
  async getCurrentLevel(): Promise<number> {
    try {
      const redis = this.redisService.getClient();
      const level = await redis.get(this.DEGRADATION_KEY);
      return level ? parseInt(level, 10) : 0;
    } catch (error) {
      this.logger.error(`Failed to get degradation level: ${error.message}`);
      return this.currentLevel;
    }
  }

  /**
   * 设置降级级别
   */
  async setLevel(level: number, reason: string): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      await redis.set(this.DEGRADATION_KEY, level.toString());
      this.currentLevel = level;

      this.logger.warn(
        `System degradation level changed to ${level}, reason: ${reason}`,
      );

      // 记录降级日志
      await this.logDegradation(level, reason);
    } catch (error) {
      this.logger.error(`Failed to set degradation level: ${error.message}`);
    }
  }

  /**
   * 手动触发降级
   */
  async manualDegrade(
    level: DegradationLevel,
    operator: string,
    reason: string,
  ): Promise<void> {
    await this.setLevel(level, `Manual degradation by ${operator}: ${reason}`);
  }

  /**
   * 恢复正常状态
   */
  async recover(): Promise<void> {
    await this.setLevel(0, "System recovered to normal");
  }

  /**
   * 检查是否应该降级
   */
  async shouldDegrade(requiredLevel: DegradationLevel): Promise<boolean> {
    const currentLevel = await this.getCurrentLevel();
    return currentLevel >= requiredLevel;
  }

  /**
   * 启动系统监控
   */
  private startMonitoring(): void {
    // 每10秒检查一次系统负载
    this.monitoringInterval = setInterval(() => {
      this.checkSystemLoad();
    }, 10000);
  }

  /**
   * 检查系统负载
   */
  private async checkSystemLoad(): Promise<void> {
    try {
      const cpuUsage = await this.getCpuUsage();
      const memoryUsage = this.getMemoryUsage();

      // 判断降级级别
      let targetLevel = 0;
      let reason = "";

      if (
        cpuUsage >= this.thresholds.cpu.heavy ||
        memoryUsage >= this.thresholds.memory.heavy
      ) {
        targetLevel = DegradationLevel.HEAVY;
        reason = `CPU: ${cpuUsage.toFixed(2)}%, Memory: ${memoryUsage.toFixed(2)}%`;
      } else if (
        cpuUsage >= this.thresholds.cpu.medium ||
        memoryUsage >= this.thresholds.memory.medium
      ) {
        targetLevel = DegradationLevel.MEDIUM;
        reason = `CPU: ${cpuUsage.toFixed(2)}%, Memory: ${memoryUsage.toFixed(2)}%`;
      } else if (
        cpuUsage >= this.thresholds.cpu.light ||
        memoryUsage >= this.thresholds.memory.light
      ) {
        targetLevel = DegradationLevel.LIGHT;
        reason = `CPU: ${cpuUsage.toFixed(2)}%, Memory: ${memoryUsage.toFixed(2)}%`;
      }

      // 如果级别变化，更新降级状态
      if (targetLevel !== this.currentLevel) {
        if (targetLevel > 0) {
          await this.setLevel(targetLevel, `Auto degradation: ${reason}`);
        } else {
          // 负载降低，恢复正常
          await this.recover();
        }
      }
    } catch (error) {
      this.logger.error(`Failed to check system load: ${error.message}`);
    }
  }

  /**
   * 获取CPU使用率
   */
  private async getCpuUsage(): Promise<number> {
    return new Promise((resolve) => {
      const startUsage = process.cpuUsage();
      const startTime = Date.now();

      setTimeout(() => {
        const endUsage = process.cpuUsage(startUsage);
        const endTime = Date.now();
        const elapsedTime = endTime - startTime;

        const totalUsage = (endUsage.user + endUsage.system) / 1000; // 转换为毫秒
        const usage = (totalUsage / elapsedTime) * 100;

        resolve(Math.min(usage, 100));
      }, 100);
    });
  }

  /**
   * 获取内存使用率
   */
  private getMemoryUsage(): number {
    const totalMemory = os.totalmem();
    const freeMemory = os.freemem();
    const usedMemory = totalMemory - freeMemory;
    return (usedMemory / totalMemory) * 100;
  }

  /**
   * 记录降级日志
   */
  private async logDegradation(level: number, reason: string): Promise<void> {
    try {
      const redis = this.redisService.getClient();
      const log = {
        level,
        reason,
        timestamp: new Date().toISOString(),
      };

      await redis.lpush("system:degradation:logs", JSON.stringify(log));

      // 只保留最近100条日志
      await redis.ltrim("system:degradation:logs", 0, 99);
    } catch (error) {
      this.logger.error(`Failed to log degradation: ${error.message}`);
    }
  }
}
