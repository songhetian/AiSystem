import { ForbiddenException, Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

export interface AccessScope {
  isSuperAdmin: boolean;
  user_id: string;
  platform_id?: string | null;
  dept_id?: string | null;
  shop_id?: string | null;
}

export interface ScopeFieldMap {
  platform?: string;
  department?: string;
  shop?: string;
}

@Injectable()
export class ScopeService {
  constructor(private readonly prisma: PrismaService) {}

  async resolveAccess(userId: string): Promise<AccessScope> {
    const [user, userRoles] = await Promise.all([
      this.prisma.sys_user.findUnique({ where: { id: userId } }),
      this.prisma.sys_user_role.findMany({
        where: { user_id: userId },
        include: { role: true }
      })
    ]);

    const roleCodes = userRoles.map((item) => item.role.role_code);

    return {
      isSuperAdmin: roleCodes.includes('super_admin'),
      user_id: userId,
      platform_id: user?.platform_id,
      dept_id: user?.dept_id,
      shop_id: user?.shop_id
    };
  }

  applyPlatformScope<T extends Record<string, unknown>>(scope: AccessScope, where: T = {} as T): T {
    return this.applyScope(scope, where, { platform: 'platform_id' });
  }

  applyDepartmentScope<T extends Record<string, unknown>>(scope: AccessScope, where: T = {} as T): T {
    return this.applyScope(scope, where, { platform: 'platform_id', department: 'department_id' });
  }

  applyShopScope<T extends Record<string, unknown>>(scope: AccessScope, where: T = {} as T): T {
    return this.applyScope(scope, where, {
      platform: 'platform_id',
      department: 'department_id',
      shop: 'shop_id'
    });
  }

  applyScope<T extends Record<string, unknown>>(
    scope: AccessScope,
    where: T = {} as T,
    fields: ScopeFieldMap
  ): T {
    if (scope.isSuperAdmin) {
      return where;
    }

    return {
      ...where,
      ...(fields.platform && scope.platform_id ? { [fields.platform]: scope.platform_id } : {}),
      ...(fields.department && scope.dept_id ? { [fields.department]: scope.dept_id } : {}),
      ...(fields.shop && scope.shop_id ? { [fields.shop]: scope.shop_id } : {})
    };
  }

  assertSuperAdmin(scope: AccessScope, message = '当前账号无权限执行该操作') {
    if (!scope.isSuperAdmin) {
      throw new ForbiddenException(message);
    }
  }

  assertPlatformAccess(scope: AccessScope, platformId?: string | null, message = '无权操作当前平台数据') {
    if (!scope.isSuperAdmin && scope.platform_id && scope.platform_id !== platformId) {
      throw new ForbiddenException(message);
    }
  }

  assertDepartmentAccess(
    scope: AccessScope,
    departmentId?: string | null,
    message = '无权操作当前部门数据'
  ) {
    if (!scope.isSuperAdmin && scope.dept_id && scope.dept_id !== departmentId) {
      throw new ForbiddenException(message);
    }
  }

  assertShopAccess(scope: AccessScope, shopId?: string | null, message = '无权操作当前店铺数据') {
    if (!scope.isSuperAdmin && scope.shop_id && scope.shop_id !== shopId) {
      throw new ForbiddenException(message);
    }
  }
}
