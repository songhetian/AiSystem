import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { SystemMessagesService } from "./system-messages.service";
import * as dayjs from "dayjs";

@Injectable()
export class IntegrationMonitorService {
  private readonly logger = new Logger(IntegrationMonitorService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageService: SystemMessagesService,
  ) {}

  private get integrationStatDelegate() {
    return this.prisma[
      "sys_integration_stat" as keyof typeof this.prisma
    ] as any;
  }

  /**
   * 汇总集成日志并生成统计报表 (Section 3.3)
   * 建议每小时运行一次，或在后台持续聚合
   */
  async aggregateLogsToStats(platformId?: string, deptId?: string) {
    this.logger.log("Starting integration log aggregation...");

    // 获取过去一个小时的时间区间
    const now = dayjs();
    const startTime = now.subtract(1, "hour").startOf("hour").toDate();
    const endTime = now.subtract(1, "hour").endOf("hour").toDate();
    const statTime = now.subtract(1, "hour").startOf("hour").toDate();

    // 聚合查询
    const logs = await this.prisma.sys_integration_log.groupBy({
      by: ["platform_id", "dept_id", "shop_id", "log_level"],
      where: {
        create_time: { gte: startTime, lte: endTime },
        is_deleted: 0,
        ...(platformId ? { platform_id: platformId } : {}),
        ...(deptId ? { dept_id: deptId } : {}),
      },
      _count: { id: true },
      _avg: { duration_ms: true },
    });

    if (logs.length === 0) {
      this.logger.log("No logs found for the aggregation period.");
      return;
    }

    // 按 Scope (Platform + Dept + Shop) 分组处理数据
    const scopeGroups = new Map<string, any>();

    for (const log of logs) {
      const key = `${log.platform_id}-${log.dept_id}-${log.shop_id || ""}`;
      if (!scopeGroups.has(key)) {
        scopeGroups.set(key, {
          stat_time: statTime,
          platform_id: log.platform_id,
          dept_id: log.dept_id,
          shop_id: log.shop_id || "",
          total: 0,
          success: 0,
          fail: 0,
          total_duration: 0,
        });
      }

      const group = scopeGroups.get(key);
      const count = log._count.id;
      group.total += count;
      if (log.log_level === "ERROR") {
        group.fail += count;
      } else {
        group.success += count;
      }
      group.total_duration += (log._avg.duration_ms || 0) * count;
    }

    // 写入数据库 [Upsert]
    for (const group of scopeGroups.values()) {
      await this.integrationStatDelegate().upsert({
        where: {
          stat_time_platform_id_dept_id_shop_id: {
            stat_time: group.stat_time,
            platform_id: group.platform_id,
            dept_id: group.dept_id,
            shop_id: group.shop_id,
          },
        },
        update: {
          total_calls: group.total,
          success_calls: group.success,
          fail_calls: group.fail,
          avg_duration_ms: Math.round(group.total_duration / group.total),
        },
        create: {
          stat_time: group.stat_time,
          platform_id: group.platform_id,
          dept_id: group.dept_id,
          shop_id: group.shop_id,
          total_calls: group.total,
          success_calls: group.success,
          fail_calls: group.fail,
          avg_duration_ms: Math.round(group.total_duration / group.total),
        },
      });
    }

    this.logger.log(
      `Aggregation completed. Processed ${scopeGroups.size} scope groups.`,
    );
  }

  /**
   * 获取集成健康报告 (Section 3.4)
   */
  async getHealthReport(platformId: string, deptId: string, shopId?: string) {
    const stats = await this.integrationStatDelegate().findMany({
      where: {
        platform_id: platformId,
        dept_id: deptId,
        ...(shopId ? { shop_id: shopId } : {}),
      },
      orderBy: { stat_time: "desc" },
      take: 24, // 最近 24 小时
    });

    if (stats.length === 0) return { status: "UNKNOWN", message: "无统计数据" };

    const totalCalls = stats.reduce((sum, s) => sum + s.total_calls, 0);
    const totalSuccess = stats.reduce((sum, s) => sum + s.success_calls, 0);
    const avgDuration = Math.round(
      stats.reduce((sum, s) => sum + s.avg_duration_ms, 0) / stats.length,
    );
    const successRate =
      totalCalls > 0 ? (totalSuccess / totalCalls) * 100 : 100;

    let status = "HEALTHY";
    if (successRate < 90) status = "UNHEALTHY";
    else if (successRate < 98) status = "WARNING";

    return {
      status,
      successRate: successRate.toFixed(2) + "%",
      avgDuration: avgDuration + "ms",
      totalCalls,
      lastStatTime: stats[0].stat_time,
    };
  }
}
