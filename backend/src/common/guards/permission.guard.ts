import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { PrismaService } from '../../prisma/prisma.service';
import { PERMISSION_KEY } from '../permission.decorator';

@Injectable()
export class PermissionGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaService
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

    const relations = await this.prisma.sys_user_role.findMany({
      where: { user_id: user.sub },
      include: {
        role: true
      }
    });
    const roleIds = relations.map((item) => item.role_id);
    if (roleIds.length === 0) {
      throw new ForbiddenException('当前用户未分配角色');
    }

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

    const allowedRoleIds = (apiPermission.role_ids as string[]) ?? [];
    const matched = roleIds.some((roleId) => allowedRoleIds.includes(roleId));
    if (!matched) {
      throw new ForbiddenException('无权限访问该接口');
    }

    return true;
  }
}
