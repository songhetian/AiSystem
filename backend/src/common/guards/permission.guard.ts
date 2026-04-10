import { CanActivate, ExecutionContext, ForbiddenException, Injectable, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../services/redis.service';
import { PERMISSION_KEY } from '../permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  private readonly logger = new Logger(PermissionGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const permissionCode = this.reflector.getAllAndOverride<string>(PERMISSION_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (!permissionCode) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user as { sub?: string };
    if (!user?.sub) {
      throw new ForbiddenException('未登录或登录状态已失效');
    }

    // 1. 尝试从缓存获取用户的角色 IDs
    const userRoleKey = `user:roles:${user.sub}`;
    let roleIds: string[] = [];
    const cachedRoles = await this.redisService.get(userRoleKey);

    if (cachedRoles) {
      roleIds = JSON.parse(cachedRoles);
    } else {
      const relations = await this.prisma.sys_user_role.findMany({
        where: { user_id: user.sub }
      });
      roleIds = relations.map((item) => item.role_id);
      await this.redisService.set(userRoleKey, JSON.stringify(roleIds), 600); // 缓存 10 分钟
    }

    if (roleIds.length === 0) {
      throw new ForbiddenException('当前用户未分配角色');
    }

    // 2. 尝试从缓存获取 API 允许的角色 IDs
    const apiPermissionKey = `api:permission:${permissionCode}`;
    let allowedRoleIds: string[] = [];
    const cachedAllowed = await this.redisService.get(apiPermissionKey);

    if (cachedAllowed) {
      allowedRoleIds = JSON.parse(cachedAllowed);
    } else {
      const apiPermission = await this.prisma.sys_api_permission.findFirst({
        where: {
          is_deleted: 0,
          status: 1,
          api_name: permissionCode
        }
      });

      if (!apiPermission) {
        return true;
      }

      allowedRoleIds = (apiPermission.role_ids as string[]) ?? [];
      await this.redisService.set(apiPermissionKey, JSON.stringify(allowedRoleIds), 600);
    }

    const matched = roleIds.some((roleId) => allowedRoleIds.includes(roleId));
    if (!matched) {
      throw new ForbiddenException('无权限访问该接口');
    }

    return true;
  }
}
