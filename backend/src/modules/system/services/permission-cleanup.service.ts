import { Injectable, Logger } from "@nestjs/common";
import { Cron, CronExpression } from "@nestjs/schedule";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../common/services/redis.service";

/**
 * 权限配置清理服务
 * 定期检测和清理冗余的权限配置
 */
@Injectable()
export class PermissionCleanupService {
  private readonly logger = new Logger(PermissionCleanupService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 每周日凌晨2点执行清理任务
   */
  @Cron(CronExpression.EVERY_WEEK)
  async scheduledCleanup() {
    this.logger.log("开始执行定期权限配置清理任务");
    const result = await this.cleanupRedundantPermissions();
    this.logger.log(`清理任务完成: ${JSON.stringify(result)}`);
  }

  /**
   * 手动触发清理
   */
  async cleanupRedundantPermissions() {
    const results = {
      redundantMenus: 0,
      redundantButtons: 0,
      invalidRoles: 0,
      orphanedPermissions: 0,
      totalCleaned: 0,
    };

    try {
      // 1. 清理"不需要权限控制"功能的分配记录
      const noControlConfigs =
        await this.prisma.sys_permission_control_config.findMany({
          where: {
            need_control: 0,
            is_deleted: 0,
          },
        });

      for (const config of noControlConfigs) {
        if (config.resource_type === "menu") {
          const deleted = await this.prisma.sys_role_menu.deleteMany({
            where: { menu_id: config.resource_id },
          });
          results.redundantMenus += deleted.count;
        } else if (config.resource_type === "button") {
          const deleted = await this.prisma.sys_role_button.deleteMany({
            where: { button_id: config.resource_id },
          });
          results.redundantButtons += deleted.count;
        }
      }

      // 2. 清理已删除角色的权限分配
      const deletedRoles = await this.prisma.sys_role.findMany({
        where: { is_deleted: 1 },
        select: { id: true },
      });

      for (const role of deletedRoles) {
        const menuDeleted = await this.prisma.sys_role_menu.deleteMany({
          where: { role_id: role.id },
        });
        const buttonDeleted = await this.prisma.sys_role_button.deleteMany({
          where: { role_id: role.id },
        });
        results.invalidRoles += menuDeleted.count + buttonDeleted.count;
      }

      // 3. 清理孤立的权限分配（菜单或按钮已被删除）
      const allMenus = await this.prisma.sys_menu.findMany({
        where: { is_deleted: 0 },
        select: { id: true },
      });
      const validMenuIds = allMenus.map((m) => m.id);

      const orphanedMenus = await this.prisma.sys_role_menu.deleteMany({
        where: {
          menu_id: { notIn: validMenuIds },
        },
      });
      results.orphanedPermissions += orphanedMenus.count;

      const allButtons = await this.prisma.sys_button.findMany({
        where: { is_deleted: 0 },
        select: { id: true },
      });
      const validButtonIds = allButtons.map((b) => b.id);

      const orphanedButtons = await this.prisma.sys_role_button.deleteMany({
        where: {
          button_id: { notIn: validButtonIds },
        },
      });
      results.orphanedPermissions += orphanedButtons.count;

      // 4. 计算总清理数量
      results.totalCleaned =
        results.redundantMenus +
        results.redundantButtons +
        results.invalidRoles +
        results.orphanedPermissions;

      // 5. 清除所有权限缓存
      if (results.totalCleaned > 0) {
        await this.redisService.deleteByPattern("cache:*");
        await this.redisService.deleteByPattern("user:roles:*");
        await this.redisService.deleteByPattern("api:permission:*");
      }

      // 6. 记录清理日志
      await this.logCleanup(results);

      return {
        success: true,
        message: `成功清理 ${results.totalCleaned} 条冗余配置`,
        details: results,
      };
    } catch (error) {
      this.logger.error("权限配置清理失败", error);
      return {
        success: false,
        message: "清理失败",
        error: error instanceof Error ? error.message : String(error),
      };
    }
  }

  /**
   * 检测冗余配置（不执行清理）
   */
  async detectRedundantPermissions() {
    const issues: {
      redundantMenus: Array<{ resourceId: string; resourceName: string; count: number }>;
      redundantButtons: Array<{ resourceId: string; resourceName: string; count: number }>;
      invalidRoles: Array<{ roleId: string; roleName: string; count: number }>;
      orphanedPermissions: Array<{ type: string; menuCount: number; buttonCount: number; total: number }>;
    } = {
      redundantMenus: [],
      redundantButtons: [],
      invalidRoles: [],
      orphanedPermissions: [],
    };

    // 1. 检测"不需要权限控制"功能的分配记录
    const noControlConfigs =
      await this.prisma.sys_permission_control_config.findMany({
        where: {
          need_control: 0,
          is_deleted: 0,
        },
      });

    for (const config of noControlConfigs) {
      if (config.resource_type === "menu") {
        const count = await this.prisma.sys_role_menu.count({
          where: { menu_id: config.resource_id },
        });
        if (count > 0) {
          issues.redundantMenus.push({
            resourceId: config.resource_id,
            resourceName: config.resource_name,
            count,
          });
        }
      } else if (config.resource_type === "button") {
        const count = await this.prisma.sys_role_button.count({
          where: { button_id: config.resource_id },
        });
        if (count > 0) {
          issues.redundantButtons.push({
            resourceId: config.resource_id,
            resourceName: config.resource_name,
            count,
          });
        }
      }
    }

    // 2. 检测已删除角色的权限分配
    const deletedRoles = await this.prisma.sys_role.findMany({
      where: { is_deleted: 1 },
      select: { id: true, role_name: true },
    });

    for (const role of deletedRoles) {
      const menuCount = await this.prisma.sys_role_menu.count({
        where: { role_id: role.id },
      });
      const buttonCount = await this.prisma.sys_role_button.count({
        where: { role_id: role.id },
      });
      if (menuCount + buttonCount > 0) {
        issues.invalidRoles.push({
          roleId: role.id,
          roleName: role.role_name,
          count: menuCount + buttonCount,
        });
      }
    }

    // 3. 检测孤立的权限分配
    const allMenus = await this.prisma.sys_menu.findMany({
      where: { is_deleted: 0 },
      select: { id: true },
    });
    const validMenuIds = allMenus.map((m) => m.id);

    const orphanedMenuCount = await this.prisma.sys_role_menu.count({
      where: {
        menu_id: { notIn: validMenuIds },
      },
    });

    const allButtons = await this.prisma.sys_button.findMany({
      where: { is_deleted: 0 },
      select: { id: true },
    });
    const validButtonIds = allButtons.map((b) => b.id);

    const orphanedButtonCount = await this.prisma.sys_role_button.count({
      where: {
        button_id: { notIn: validButtonIds },
      },
    });

    if (orphanedMenuCount + orphanedButtonCount > 0) {
      issues.orphanedPermissions.push({
        type: "orphaned",
        menuCount: orphanedMenuCount,
        buttonCount: orphanedButtonCount,
        total: orphanedMenuCount + orphanedButtonCount,
      });
    }

    const totalIssues =
      issues.redundantMenus.length +
      issues.redundantButtons.length +
      issues.invalidRoles.length +
      issues.orphanedPermissions.length;

    return {
      hasIssues: totalIssues > 0,
      totalIssues,
      issues,
    };
  }

  /**
   * 记录清理日志
   */
  private async logCleanup(results: any) {
    try {
      await this.prisma.sys_operation_log.create({
        data: {
          request_method: "POST",
          api_path: "/system/permission-cleanup",
          api_name: "权限配置清理",
          operation_module: "permission",
          operation_message: JSON.stringify(results),
          username: "system",
          request_ip: "127.0.0.1",
        },
      });
    } catch (error) {
      this.logger.error("记录清理日志失败", error);
    }
  }
}
