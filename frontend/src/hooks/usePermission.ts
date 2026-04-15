import { useGlobalStore } from '@/models/global';

/**
 * 权限Hook（V2.0 性能优化）
 * 优化点：使用Set查询，时间复杂度O(1)
 * 
 * 使用示例：
 * const { hasPermission, hasRoute } = usePermission();
 * 
 * if (hasPermission('user:create')) {
 *   // 显示创建按钮
 * }
 * 
 * if (hasRoute('/system/users')) {
 *   // 允许访问该路由
 * }
 */
export function usePermission() {
  const currentUser = useGlobalStore((state) => state.currentUser);

  /**
   * 检查按钮权限
   * @param code 权限码
   * @returns 是否有权限
   */
  const hasPermission = (code: string): boolean => {
    return currentUser?.buttonCodesSet?.has(code) ?? false;
  };

  /**
   * 检查多个按钮权限（任意一个满足即可）
   * @param codes 权限码数组
   * @returns 是否有权限
   */
  const hasAnyPermission = (codes: string[]): boolean => {
    if (!currentUser?.buttonCodesSet) return false;
    return codes.some(code => currentUser.buttonCodesSet!.has(code));
  };

  /**
   * 检查多个按钮权限（全部满足）
   * @param codes 权限码数组
   * @returns 是否有权限
   */
  const hasAllPermissions = (codes: string[]): boolean => {
    if (!currentUser?.buttonCodesSet) return false;
    return codes.every(code => currentUser.buttonCodesSet!.has(code));
  };

  /**
   * 检查菜单权限
   * @param code 菜单码
   * @returns 是否有权限
   */
  const hasMenu = (code: string): boolean => {
    return currentUser?.menuCodesSet?.has(code) ?? false;
  };

  /**
   * 检查路由权限
   * @param route 路由路径
   * @returns 是否有权限
   */
  const hasRoute = (route: string): boolean => {
    return currentUser?.routesSet?.has(route) ?? false;
  };

  return {
    hasPermission,
    hasAnyPermission,
    hasAllPermissions,
    hasMenu,
    hasRoute,
    currentUser,
  };
}

export default usePermission;
