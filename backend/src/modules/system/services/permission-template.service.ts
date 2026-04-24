import { Injectable, Logger, BadRequestException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../common/services/redis.service";
import {
  CreatePermissionTemplateDto,
  UpdatePermissionTemplateDto,
  QueryPermissionTemplateDto,
  ApplyTemplateDto,
  ExportTemplateDto,
  ImportTemplateDto,
} from "../dto/permission-template.dto";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";
import * as crypto from "crypto";

/**
 * 权限模板服务
 */
@Injectable()
export class PermissionTemplateService {
  private readonly logger = new Logger(PermissionTemplateService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 获取模板列表
   */
  @Cache({ ttl: 300, byParams: true, prefix: "permission-templates" })
  /**
   * 获取权限模板列表（V2.0 性能优化）
   * 优化点：添加缓存（10分钟）和查询监控
   */
  @Cache({ ttl: 600, byParams: true, prefix: "permission-template-list" })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async getTemplateList(query: QueryPermissionTemplateDto) {
    const where: any = { is_deleted: 0 };

    if (query.templateType) {
      where.template_type = query.templateType;
    }

    if (query.category) {
      where.category = query.category;
    }

    if (query.keyword) {
      where.OR = [
        { template_name: { contains: query.keyword } },
        { description: { contains: query.keyword } },
      ];
    }

    return await this.prisma.sys_permission_template.findMany({
      where,
      select: {
        id: true,
        template_name: true,
        template_type: true,
        category: true,
        description: true,
        is_default: true,
        create_time: true,
        update_time: true,
      },
      orderBy: [
        { is_default: "desc" },
        { template_type: "asc" },
        { create_time: "desc" },
      ],
    });
  }

  /**
   * 获取模板详情
   */
  @Cache({ ttl: 300, byParams: true, prefix: "permission-template" })
  /**
   * 根据ID获取权限模板（V2.0 性能优化）
   * 优化点：添加缓存（10分钟）
   */
  @Cache({ ttl: 600, byParams: true, prefix: "permission-template" })
  async getTemplateById(id: string) {
    const template = await this.prisma.sys_permission_template.findFirst({
      where: { id, is_deleted: 0 },
    });

    if (!template) {
      throw new BadRequestException("模板不存在");
    }

    return template;
  }

  /**
   * 创建模板
   */
  @CacheEvict({ pattern: "cache:permission-template*" })
  /**
   * 创建权限模板（V2.0 性能优化）
   * 优化点：自动清除相关缓存
   */
  @CacheEvict({ pattern: "cache:permission-template*" })
  async createTemplate(dto: CreatePermissionTemplateDto, userId: string) {
    // 检查模板名称是否重复
    const existing = await this.prisma.sys_permission_template.findFirst({
      where: {
        template_name: dto.templateName,
        is_deleted: 0,
      },
    });

    if (existing) {
      throw new BadRequestException("模板名称已存在");
    }

    return await this.prisma.sys_permission_template.create({
      data: {
        template_name: dto.templateName,
        template_type: dto.templateType,
        description: dto.description,
        permission_config: dto.permissionConfig,
        category: dto.category,
        platform_id: dto.platformId,
        dept_id: dto.deptId,
        created_by: userId,
      },
    });
  }

  /**
   * 更新模板
   */
  @CacheEvict({ pattern: "cache:permission-template*" })
  /**
   * 更新权限模板（V2.0 性能优化）
   * 优化点：自动清除相关缓存
   */
  @CacheEvict({ pattern: "cache:permission-template*" })
  async updateTemplate(dto: UpdatePermissionTemplateDto) {
    const template = await this.getTemplateById(dto.id);

    // 系统默认模板不可修改
    if (template.is_default === 1) {
      throw new BadRequestException("系统默认模板不可修改");
    }

    // 检查模板名称是否重复
    if (dto.templateName) {
      const existing = await this.prisma.sys_permission_template.findFirst({
        where: {
          template_name: dto.templateName,
          is_deleted: 0,
          id: { not: dto.id },
        },
      });

      if (existing) {
        throw new BadRequestException("模板名称已存在");
      }
    }

    return await this.prisma.sys_permission_template.update({
      where: { id: dto.id },
      data: {
        template_name: dto.templateName,
        description: dto.description,
        permission_config: dto.permissionConfig,
        category: dto.category,
      },
    });
  }

  /**
   * 删除模板
   */
  @CacheEvict({ pattern: "cache:permission-template*" })
  /**
   * 删除权限模板（V2.0 性能优化）
   * 优化点：自动清除相关缓存
   */
  @CacheEvict({ pattern: "cache:permission-template*" })
  async deleteTemplate(id: string) {
    const template = await this.getTemplateById(id);

    // 系统默认模板不可删除
    if (template.is_default === 1) {
      throw new BadRequestException("系统默认模板不可删除");
    }

    return await this.prisma.sys_permission_template.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  /**
   * 应用模板到角色
   */
  @CacheEvict({ pattern: "cache:*" })
  async applyTemplate(dto: ApplyTemplateDto) {
    const template = await this.getTemplateById(dto.templateId);
    const config = template.permission_config as any;

    return await this.prisma.$transaction(async (tx) => {
      // 1. 删除角色现有权限
      await tx.sys_role_menu.deleteMany({
        where: { role_id: dto.roleId },
      });
      await tx.sys_role_button.deleteMany({
        where: { role_id: dto.roleId },
      });

      // 2. 应用模板权限
      if (config.type === "all") {
        // 全部权限：获取所有菜单和按钮
        const [allMenus, allButtons] = await Promise.all([
          tx.sys_menu.findMany({
            where: { is_deleted: 0, status: 1 },
            select: { id: true },
          }),
          tx.sys_button.findMany({
            where: { is_deleted: 0, status: 1 },
            select: { id: true },
          }),
        ]);

        if (allMenus.length > 0) {
          await tx.sys_role_menu.createMany({
            data: allMenus.map((menu) => ({
              role_id: dto.roleId,
              menu_id: menu.id,
            })),
          });
        }

        if (allButtons.length > 0) {
          await tx.sys_role_button.createMany({
            data: allButtons.map((button) => ({
              role_id: dto.roleId,
              button_id: button.id,
            })),
          });
        }
      } else {
        // 自定义权限
        let menuIds = config.menuIds || [];
        let buttonIds = config.buttonIds || [];

        // 部分套用
        if (dto.partial === 1 && dto.selectedPermissionIds) {
          menuIds = menuIds.filter((id: string) =>
            dto.selectedPermissionIds!.includes(id),
          );
          buttonIds = buttonIds.filter((id: string) =>
            dto.selectedPermissionIds!.includes(id),
          );
        }

        if (menuIds.length > 0) {
          await tx.sys_role_menu.createMany({
            data: menuIds.map((menuId: string) => ({
              role_id: dto.roleId,
              menu_id: menuId,
            })),
          });
        }

        if (buttonIds.length > 0) {
          await tx.sys_role_button.createMany({
            data: buttonIds.map((buttonId: string) => ({
              role_id: dto.roleId,
              button_id: buttonId,
            })),
          });
        }
      }

      // 3. 清除权限缓存
      await this.clearPermissionCache(dto.roleId);

      return {
        success: true,
        message: "模板应用成功",
        menuCount: config.type === "all" ? "全部" : config.menuIds?.length || 0,
        buttonCount:
          config.type === "all" ? "全部" : config.buttonIds?.length || 0,
      };
    });
  }

  /**
   * 导出模板
   */
  async exportTemplates(dto: ExportTemplateDto) {
    const templates = await this.prisma.sys_permission_template.findMany({
      where: {
        id: { in: dto.templateIds },
        is_deleted: 0,
      },
    });

    const exportData = templates.map((template) => ({
      template_name: template.template_name,
      template_type: template.template_type,
      description: template.description,
      permission_config: template.permission_config,
      category: template.category,
    }));

    // 加密导出
    if (dto.encrypted === 1) {
      const encrypted = this.encryptData(JSON.stringify(exportData));
      return {
        encrypted: true,
        data: encrypted,
      };
    }

    return {
      encrypted: false,
      data: exportData,
    };
  }

  /**
   * 导入模板
   */
  @CacheEvict({ pattern: "cache:permission-template*" })
  async importTemplates(dto: ImportTemplateDto, userId: string) {
    const results: Array<{ name: string; status: string; error?: string }> = [];

    for (const template of dto.templates) {
      try {
        // 检查是否存在同名模板
        const existing = await this.prisma.sys_permission_template.findFirst({
          where: {
            template_name: template.template_name,
            is_deleted: 0,
          },
        });

        if (existing) {
          if (dto.overwrite === 1) {
            // 覆盖
            await this.prisma.sys_permission_template.update({
              where: { id: existing.id },
              data: {
                description: template.description,
                permission_config: template.permission_config,
                category: template.category,
              },
            });
            results.push({ name: template.template_name, status: "updated" });
          } else {
            results.push({ name: template.template_name, status: "skipped" });
          }
        } else {
          // 新建
          await this.prisma.sys_permission_template.create({
            data: {
              template_name: template.template_name,
              template_type: template.template_type || "custom",
              description: template.description,
              permission_config: template.permission_config,
              category: template.category,
              created_by: userId,
            },
          });
          results.push({ name: template.template_name, status: "created" });
        }
      } catch (error) {
        results.push({
          name: template.template_name,
          status: "failed",
          error: error instanceof Error ? error.message : String(error),
        });
      }
    }

    return {
      success: true,
      message: "导入完成",
      results,
    };
  }

  /**
   * 基于已有模板创建新模板
   */
  @CacheEvict({ pattern: "cache:permission-template*" })
  async copyTemplate(templateId: string, newName: string, userId: string) {
    const template = await this.getTemplateById(templateId);

    // 检查新名称是否重复
    const existing = await this.prisma.sys_permission_template.findFirst({
      where: {
        template_name: newName,
        is_deleted: 0,
      },
    });

    if (existing) {
      throw new BadRequestException("模板名称已存在");
    }

    return await this.prisma.sys_permission_template.create({
      data: {
        template_name: newName,
        template_type: "custom",
        description: template.description,
        permission_config: template.permission_config as any,
        category: template.category,
        platform_id: template.platform_id,
        dept_id: template.dept_id,
        created_by: userId,
      },
    });
  }

  /**
   * 清除权限缓存
   */
  private async clearPermissionCache(roleId: string) {
    // 清除角色相关的用户缓存
    const users = await this.prisma.sys_user_role.findMany({
      where: { role_id: roleId },
      select: { user_id: true },
    });

    const userRoleKeys = users.map((u) => `user:roles:${u.user_id}`);
    if (userRoleKeys.length > 0) {
      await Promise.all(userRoleKeys.map((key) => this.redisService.del(key)));
    }

    // 清除所有API权限缓存
    await this.redisService.deleteByPattern("api:permission:*");

    // 清除菜单树缓存
    await this.redisService.deleteByPattern("cache:menu-tree:*");

    // 发布权限变更事件
    await this.redisService.publish(
      "permission:changed",
      JSON.stringify({
        type: "template_apply",
        role_id: roleId,
        timestamp: Date.now(),
      }),
    );

    this.logger.log(`Cleared permission cache for role: ${roleId}`);
  }

  /**
   * 加密数据
   */
  private encryptData(data: string): string {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || "default-key",
      "salt",
      32,
    );
    const iv = crypto.randomBytes(16);
    const cipher = crypto.createCipheriv(algorithm, key, iv);
    let encrypted = cipher.update(data, "utf8", "hex");
    encrypted += cipher.final("hex");
    return iv.toString("hex") + ":" + encrypted;
  }

  /**
   * 解密数据
   */
  private decryptData(encrypted: string): string {
    const algorithm = "aes-256-cbc";
    const key = crypto.scryptSync(
      process.env.ENCRYPTION_KEY || "default-key",
      "salt",
      32,
    );
    const parts = encrypted.split(":");
    const iv = Buffer.from(parts[0], "hex");
    const encryptedText = parts[1];
    const decipher = crypto.createDecipheriv(algorithm, key, iv);
    let decrypted = decipher.update(encryptedText, "hex", "utf8");
    decrypted += decipher.final("utf8");
    return decrypted;
  }
}
