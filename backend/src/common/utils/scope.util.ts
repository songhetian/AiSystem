export interface UserScope {
  platform_id?: string | null;
  dept_id?: string | null;
  shop_id?: string | null;
}

export function buildScopedWhere<T extends Record<string, unknown>>(scope: UserScope, where: T = {} as T): T {
  return {
    ...where,
    ...(scope.platform_id ? { platform_id: scope.platform_id } : {}),
    ...(scope.dept_id ? { dept_id: scope.dept_id } : {}),
    ...(scope.shop_id ? { shop_id: scope.shop_id } : {})
  };
}
