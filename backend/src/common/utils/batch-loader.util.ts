import { PrismaService } from '../../prisma/prisma.service';

/**
 * 批量加载工具 (V1.0)
 *
 * 职责：优化N+1查询问题，将多次单独查询合并为一次批量查询
 *
 * 使用场景：
 * 1. 查询用户列表时，需要关联查询部门信息
 * 2. 查询订单列表时，需要关联查询用户信息
 * 3. 任何需要关联查询的场景
 *
 * @example
 * ```typescript
 * // 不使用批量加载（N+1问题）
 * const users = await prisma.user.findMany();
 * for (const user of users) {
 *   user.department = await prisma.department.findUnique({ where: { id: user.dept_id } });
 * }
 *
 * // 使用批量加载（优化后）
 * const users = await prisma.user.findMany();
 * const deptIds = users.map(u => u.dept_id).filter(Boolean);
 * const departments = await BatchLoader.loadDepartments(prisma, deptIds);
 * users.forEach(user => {
 *   user.department = departments.get(user.dept_id);
 * });
 * ```
 */
export class BatchLoader {
  /**
   * 批量加载用户信息
   */
  static async loadUsers(
    prisma: PrismaService,
    userIds: string[],
  ): Promise<Map<string, any>> {
    if (userIds.length === 0) {
      return new Map();
    }

    const users = await prisma.sys_user.findMany({
      where: { id: { in: userIds }, is_deleted: 0 },
      select: {
        id: true,
        username: true,
        name: true,
        phone: true,
        email: true,
        status: true,
      },
    });

    return new Map(users.map((user) => [user.id, user]));
  }

  /**
   * 批量加载部门信息
   */
  static async loadDepartments(
    prisma: PrismaService,
    deptIds: string[],
  ): Promise<Map<string, any>> {
    if (deptIds.length === 0) {
      return new Map();
    }

    const departments = await prisma.biz_department.findMany({
      where: { id: { in: deptIds }, is_deleted: 0 },
      select: {
        id: true,
        name: true,
        code: true,
        parent_id: true,
        status: true,
      },
    });

    return new Map(departments.map((dept) => [dept.id, dept]));
  }

  /**
   * 批量加载平台信息
   */
  static async loadPlatforms(
    prisma: PrismaService,
    platformIds: string[],
  ): Promise<Map<string, any>> {
    if (platformIds.length === 0) {
      return new Map();
    }

    const platforms = await prisma.biz_platform.findMany({
      where: { id: { in: platformIds }, is_deleted: 0 },
      select: {
        id: true,
        name: true,
        code: true,
        status: true,
      },
    });

    return new Map(platforms.map((platform) => [platform.id, platform]));
  }

  /**
   * 批量加载店铺信息
   */
  static async loadShops(
    prisma: PrismaService,
    shopIds: string[],
  ): Promise<Map<string, any>> {
    if (shopIds.length === 0) {
      return new Map();
    }

    const shops = await prisma.biz_shop.findMany({
      where: { id: { in: shopIds }, is_deleted: 0 },
      select: {
        id: true,
        name: true,
        code: true,
        type: true,
        status: true,
      },
    });

    return new Map(shops.map((shop) => [shop.id, shop]));
  }

  /**
   * 批量加载员工信息
   */
  static async loadEmployees(
    prisma: PrismaService,
    employeeIds: string[],
  ): Promise<Map<string, any>> {
    if (employeeIds.length === 0) {
      return new Map();
    }

    const employees = await prisma.hr_employee.findMany({
      where: { id: { in: employeeIds }, is_deleted: 0 },
      select: {
        id: true,
        name: true,
        employee_no: true,
        job_no: true,
        phone: true,
        email: true,
        status: true,
      },
    });

    return new Map(employees.map((emp) => [emp.id, emp]));
  }

  /**
   * 批量加载角色信息
   */
  static async loadRoles(
    prisma: PrismaService,
    roleIds: string[],
  ): Promise<Map<string, any>> {
    if (roleIds.length === 0) {
      return new Map();
    }

    const roles = await prisma.sys_role.findMany({
      where: { id: { in: roleIds }, is_deleted: 0 },
      select: {
        id: true,
        role_name: true,
        role_code: true,
        description: true,
        status: true,
      },
    });

    return new Map(roles.map((role) => [role.id, role]));
  }

  /**
   * 通用批量加载方法
   *
   * @param prisma Prisma实例
   * @param model 模型名称（如：'sys_user', 'biz_department'）
   * @param ids ID数组
   * @param selectFields 要查询的字段
   */
  static async loadGeneric(
    prisma: PrismaService,
    model: string,
    ids: string[],
    selectFields?: Record<string, boolean>,
  ): Promise<Map<string, any>> {
    if (ids.length === 0) {
      return new Map();
    }

    const items = await (prisma as any)[model].findMany({
      where: { id: { in: ids }, is_deleted: 0 },
      ...(selectFields ? { select: selectFields } : {}),
    });

    return new Map(items.map((item: any) => [item.id, item]));
  }

  /**
   * 批量加载并映射到对象
   *
   * @example
   * ```typescript
   * const users = await prisma.user.findMany();
   * await BatchLoader.mapRelations(prisma, users, 'dept_id', 'department',
   *   (ids) => BatchLoader.loadDepartments(prisma, ids)
   * );
   * // users[0].department 现在包含部门信息
   * ```
  /**
   * 映射关联数据
   */
  static async mapRelations<T extends Record<string, any>>(
    prisma: PrismaService,
    items: T[],
    foreignKey: keyof T,
    targetField: string,
    loader: (ids: string[]) => Promise<Map<string, any>>,
  ): Promise<void> {
    // 收集所有外键ID
    const ids = items
      .map((item) => item[foreignKey] as any)
      .filter((id): id is string => typeof id === 'string' && Boolean(id));

    if (ids.length === 0) {
      return;
    }

    // 批量加载
    const relatedMap = await loader(Array.from(new Set(ids)));

    // 映射到对象
    items.forEach((item) => {
      const id = item[foreignKey] as any;
      if (id) {
        (item as any)[targetField] = relatedMap.get(id) || null;
      } else {
        (item as any)[targetField] = null;
      }
    });
  }
}
