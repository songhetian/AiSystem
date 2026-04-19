import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../common/services/redis.service";
import { BatchAssignPermissionsDto } from "../dto/batch-assign-permissions.dto";
import {
  UpdatePermissionControlDto,
  BatchUpdatePermissionControlDto,
  QueryPermissionControlDto,
} from "../dto/update-permission-control.dto";
import { UpdateSystemConfigDto } from "../dto/update-system-config.dto";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { Cache } from "../../../common/decorators/cache.decorator";

/**
 * 权限控制服务
 * 负责权限优化相关功能
 */
@Injectable()
export class SystemPermissionControlService {
  private readonly logger = new Logger(SystemPermissionControlService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 批量分配/取消权限
   */
  @CacheEvict({ pattern: "cache:*" })
  async batchAssignPermissions(dto: BatchAssignPermissionsDto) {
    const { roleIds, permissionIds, action } = dto;

    return await this.prisma.$transaction(async (tx) => {
      const results: Array<{ roleId: string; action: string; menuCount?: number; buttonCount?: number; deletedMenus?: any; deletedButtons?: any }> = [];

      for (const roleId of roleIds) {
        if (action === "assign") {
          // 批量分配权限
          // 1. 删除现有权限
          await tx.sys_role_menu.deleteMany({
            where: { role_id: roleId },
          });
          await tx.sys_role_button.deleteMany({
            where: { role_id: roleId },
          });

          // 2. 分配新权限（区分菜单和按钮）
          const menus = await tx.sys_menu.findMany({
            where: { id: { in: permissionIds } },
          });
          const buttons = await tx.sys_button.findMany({
            where: { id: { in: permissionIds } },
          });

          if (menus.length > 0) {
            await tx.sys_role_menu.createMany({
              data: menus.map((menu) => ({
                role_id: roleId,
                menu_id: menu.id,
              })),
            });
          }

          if (buttons.length > 0) {
            await tx.sys_role_button.createMany({
              data: buttons.map((button) => ({
                role_id: roleId,
                button_id: button.id,
              })),
            });
          }

          results.push({
            roleId,
            action: "assign",
            menuCount: menus.length,
            buttonCount: buttons.length,
          });
        } else {
          // 批量取消权限
          const deletedMenus = await tx.sys_role_menu.deleteMany({
            where: {
              role_id: roleId,
              menu_id: { in: permissionIds },
            },
          });

          const deletedButtons = await tx.sys_role_button.deleteMany({
            where: {
              role_id: roleId,
              button_id: { in: permissionIds },
            },
          });

          results.push({
            roleId,
            action: "revoke",
            menuCount: deletedMenus.count,
            buttonCount: deletedButtons.count,
          });
        }
      }

      // 清除所有权限相关缓存
      await this.clearPermissionCache(roleIds);

      return {
        success: true,
        message: `成功${action === "assign" ? "分配" : "取消"}权限`,
        results,
      };
    });
  }

  /**
   * 获取可分配权限（未分配给该角色的权限）
   */
  @Cache({ ttl: 300, byParams: true, prefix: "available-permissions" })
  async getAvailablePermissions(roleId: string) {
    // 获取该角色已有的权限
    const [roleMenus, roleButtons] = await Promise.all([
      this.prisma.sys_role_menu.findMany({
        where: { role_id: roleId },
        select: { menu_id: true },
      }),
      this.prisma.sys_role_button.findMany({
        where: { role_id: roleId },
        select: { button_id: true },
      }),
    ]);

    const assignedMenuIds = roleMenus.map((rm) => rm.menu_id);
    const assignedButtonIds = roleButtons.map((rb) => rb.button_id);

    // 获取所有权限
    const [allMenus, allButtons] = await Promise.all([
      this.prisma.sys_menu.findMany({
        where: { is_deleted: 0, status: 1 },
      }),
      this.prisma.sys_button.findMany({
        where: { is_deleted: 0, status: 1 },
      }),
    ]);

    // 过滤出未分配的权限
    const availableMenus = allMenus
      .filter((menu) => !assignedMenuIds.includes(menu.id))
      .map((menu) => ({
        id: menu.id,
        name: menu.menu_name,
        code: menu.menu_code,
        module: menu.menu_code?.split(":")[0] || "other",
        type: "menu" as const,
      }));

    const availableButtons = allButtons
      .filter((button) => !assignedButtonIds.includes(button.id))
      .map((button) => ({
        id: button.id,
        name: button.button_name,
        code: button.button_code,
        module: button.button_code?.split(":")[0] || "other",
        type: "button" as const,
      }));

    return [...availableMenus, ...availableButtons];
  }

  /**
   * 获取已分配权限
   */
  @Cache({ ttl: 300, byParams: true, prefix: "assigned-permissions" })
  async getAssignedPermissions(roleId: string) {
    const [roleMenus, roleButtons] = await Promise.all([
      this.prisma.sys_role_menu.findMany({
        where: { role_id: roleId },
        include: { menu: true },
      }),
      this.prisma.sys_role_button.findMany({
        where: { role_id: roleId },
        include: { button: true },
      }),
    ]);

    const assignedMenus = roleMenus.map((rm) => ({
      id: rm.menu.id,
      name: rm.menu.menu_name,
      code: rm.menu.menu_code,
      module: rm.menu.menu_code?.split(":")[0] || "other",
      type: "menu" as const,
    }));

    const assignedButtons = roleButtons.map((rb) => ({
      id: rb.button.id,
      name: rb.button.button_name,
      code: rb.button.button_code,
      module: rb.button.button_code?.split(":")[0] || "other",
      type: "button" as const,
    }));

    return [...assignedMenus, ...assignedButtons];
  }

  /**
   * 获取权限控制配置列表
   */
  @Cache({ ttl: 300, byParams: true, prefix: "permission-control-list" })
  async getPermissionControlList(query: QueryPermissionControlDto) {
    const where: any = { is_deleted: 0 };

    if (query.resourceType) {
      where.resource_type = query.resourceType;
    }

    if (query.needControl !== undefined) {
      where.need_control = query.needControl;
    }

    return await this.prisma.sys_permission_control_config.findMany({
      where,
      orderBy: [{ resource_type: "asc" }, { resource_name: "asc" }],
    });
  }

  /**
   * 更新权限控制配置
   */
  @CacheEvict({ pattern: "cache:permission-control-*" })
  async updatePermissionControl(dto: UpdatePermissionControlDto) {
    const {
      resourceType,
      resourceId,
      resourceName,
      needControl,
      exceptionRoles,
    } = dto;

    const existing = await this.prisma.sys_permission_control_config.findFirst({
      where: {
        resource_type: resourceType,
        resource_id: resourceId,
        is_deleted: 0,
      },
    });

    if (existing) {
      return await this.prisma.sys_permission_control_config.update({
        where: { id: existing.id },
        data: {
          resource_name: resourceName,
          need_control: needControl,
          exception_roles: exceptionRoles || [],
        },
      });
    } else {
      return await this.prisma.sys_permission_control_config.create({
        data: {
          resource_type: resourceType,
          resource_id: resourceId,
          resource_name: resourceName,
          need_control: needControl,
          exception_roles: exceptionRoles || [],
        },
      });
    }
  }

  /**
   * 批量更新权限控制配置
   */
  @CacheEvict({ pattern: "cache:permission-control-*" })
  async batchUpdatePermissionControl(dto: BatchUpdatePermissionControlDto) {
    return await this.prisma.$transaction(async (tx) => {
      const results: Array<any> = [];

      for (const config of dto.configs) {
        const existing = await tx.sys_permission_control_config.findFirst({
          where: {
            resource_type: config.resourceType,
            resource_id: config.resourceId,
            is_deleted: 0,
          },
        });

        if (existing) {
          const updated = await tx.sys_permission_control_config.update({
            where: { id: existing.id },
            data: {
              resource_name: config.resourceName,
              need_control: config.needControl,
              exception_roles: config.exceptionRoles || [],
            },
          });
          results.push(updated);
        } else {
          const created = await tx.sys_permission_control_config.create({
            data: {
              resource_type: config.resourceType,
              resource_id: config.resourceId,
              resource_name: config.resourceName,
              need_control: config.needControl,
              exception_roles: config.exceptionRoles || [],
            },
          });
          results.push(created);
        }
      }

      return {
        success: true,
        message: `成功更新${results.length}条配置`,
        results,
      };
    });
  }

  /**
   * 获取系统配置
   */
  @Cache({ ttl: 600, byParams: true, prefix: "system-config" })
  async getSystemConfig(configKey: string) {
    const config = await this.prisma.sys_permission_config.findUnique({
      where: { config_key: configKey },
    });

    if (!config) {
      return null;
    }

    // 根据类型转换值
    let value: any = config.config_value;
    if (config.config_type === "number") {
      value = Number(value);
    } else if (config.config_type === "boolean") {
      value = value === "1" || value === "true";
    } else if (config.config_type === "json") {
      value = JSON.parse(value);
    }

    return {
      ...config,
      value,
    };
  }

  /**
   * 更新系统配置
   */
  @CacheEvict({ pattern: "cache:system-config:*" })
  async updateSystemConfig(dto: UpdateSystemConfigDto) {
    const { configKey, configValue, configType, description } = dto;

    const existing = await this.prisma.sys_permission_config.findUnique({
      where: { config_key: configKey },
    });

    if (existing) {
      return await this.prisma.sys_permission_config.update({
        where: { config_key: configKey },
        data: {
          config_value: configValue,
          config_type: configType || 'string',
          description,
        },
      });
    } else {
      return await this.prisma.sys_permission_config.create({
        data: {
          config_key: configKey,
          config_value: configValue,
          config_type: configType || 'string',
          description,
        },
      });
    }
  }

  /**
   * 清除权限相关缓存
   */
  private async clearPermissionCache(roleIds: string[]) {
    // 1. 清除角色相关的用户缓存
    for (const roleId of roleIds) {
      const users = await this.prisma.sys_user_role.findMany({
        where: { role_id: roleId },
        select: { user_id: true },
      });

      const userRoleKeys = users.map((u) => `user:roles:${u.user_id}`);
      if (userRoleKeys.length > 0) {
        await Promise.all(
          userRoleKeys.map((key) => this.redisService.del(key)),
        );
      }
    }

    // 2. 清除所有API权限缓存
    await this.redisService.deleteByPattern("api:permission:*");

    // 3. 清除菜单树缓存
    await this.redisService.deleteByPattern("cache:menu-tree:*");

    // 4. 发布权限变更事件
    await this.redisService.publish(
      "permission:changed",
      JSON.stringify({
        type: "batch_assign",
        role_ids: roleIds,
        timestamp: Date.now(),
      }),
    );

    this.logger.log(
      `Cleared permission cache for roles: ${roleIds.join(", ")}`,
    );
  }
}
