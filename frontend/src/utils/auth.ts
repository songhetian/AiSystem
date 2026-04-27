/**
 * Token管理工具类 (V5.0)
 * 功能：
 * 1. Token存储和获取
 * 2. Token自动刷新
 * 3. 用户信息管理
 * 4. 登出清理
 */

const TOKEN_KEY = 'token';
const USER_KEY = 'currentUser';
const TOKEN_REFRESH_THRESHOLD = 5 * 60 * 1000; // 5分钟

/**
 * 用户信息接口
 */
export interface UserInfo {
  id: string;
  username: string;
  name: string;
  avatar?: string;
  platform_id?: string;
  dept_id?: string;
  shop_id?: string;
  roles?: any[];
  menus?: any[];
  buttons?: string[];
}

/**
 * 登录响应接口
 */
export interface LoginResponse {
  access_token: string;
  accessToken: string;
  user: UserInfo;
}

/**
 * 保存Token
 */
export const setToken = (token: string): void => {
  localStorage.setItem(TOKEN_KEY, token);
};

/**
 * 获取Token
 */
export const getToken = (): string | null => {
  return localStorage.getItem(TOKEN_KEY);
};

/**
 * 移除Token
 */
export const removeToken = (): void => {
  localStorage.removeItem(TOKEN_KEY);
};

/**
 * 保存用户信息
 */
export const setUserInfo = (user: UserInfo): void => {
  localStorage.setItem(USER_KEY, JSON.stringify(user));
};

/**
 * 获取用户信息
 */
export const getUserInfo = (): UserInfo | null => {
  const userStr = localStorage.getItem(USER_KEY);
  if (!userStr) return null;

  try {
    return JSON.parse(userStr);
  } catch (error) {
    console.error('[Auth] 解析用户信息失败:', error);
    return null;
  }
};

/**
 * 移除用户信息
 */
export const removeUserInfo = (): void => {
  localStorage.removeItem(USER_KEY);
};

/**
 * 检查是否已登录
 */
export const isAuthenticated = (): boolean => {
  return !!getToken();
};

/**
 * 检查Token是否即将过期
 * 注意：这个方法需要解析JWT Token，但为了简化，我们依赖后端的自动刷新机制
 */
export const shouldRefreshToken = (): boolean => {
  // 由于后端已经实现了自动刷新（通过X-Refresh-Token响应头）
  // 前端只需要在响应拦截器中处理即可
  // 这里保留方法以备将来需要主动刷新
  return false;
};

/**
 * 手动刷新Token
 * 调用后端的refresh接口
 */
export const refreshToken = async (): Promise<string | null> => {
  try {
    const token = getToken();
    if (!token) return null;

    // 动态导入request以避免循环依赖
    const { post } = await import('./request');

    const response = await post<{ access_token: string; accessToken: string }>(
      '/auth/refresh',
      {},
      { skipAuth: false }
    );

    const newToken = response.access_token || response.accessToken;
    if (newToken) {
      setToken(newToken);
      console.log('[Auth] Token手动刷新成功');
      return newToken;
    }

    return null;
  } catch (error) {
    console.error('[Auth] Token刷新失败:', error);
    return null;
  }
};

/**
 * 登出
 * 清除所有本地存储的认证信息
 */
export const logout = async (): Promise<void> => {
  try {
    // 动态导入request以避免循环依赖
    const { post } = await import('./request');

    // 调用后端登出接口（将Token加入黑名单）
    await post('/auth/logout', {}, { skipErrorHandler: true });
  } catch (error) {
    console.error('[Auth] 登出接口调用失败:', error);
  } finally {
    // 无论接口是否成功，都清除本地存储
    removeToken();
    removeUserInfo();
  }
};

/**
 * 处理登录成功
 * 保存Token和用户信息
 */
export const handleLoginSuccess = (response: LoginResponse): void => {
  const token = response.access_token || response.accessToken;
  if (token) {
    setToken(token);
  }

  if (response.user) {
    setUserInfo(response.user);
  }
};

/**
 * 检查用户权限
 * 检查用户是否拥有指定的按钮权限
 */
export const hasPermission = (permission: string): boolean => {
  const user = getUserInfo();
  if (!user || !user.buttons) return false;

  return user.buttons.includes(permission);
};

/**
 * 检查用户角色
 * 检查用户是否拥有指定的角色
 */
export const hasRole = (roleCode: string): boolean => {
  const user = getUserInfo();
  if (!user || !user.roles) return false;

  return user.roles.some((role: any) => role.role_code === roleCode);
};

/**
 * 获取用户菜单
 */
export const getUserMenus = (): any[] => {
  const user = getUserInfo();
  return user?.menus || [];
};

/**
 * 获取用户按钮权限
 */
export const getUserButtons = (): string[] => {
  const user = getUserInfo();
  return user?.buttons || [];
};

export default {
  setToken,
  getToken,
  removeToken,
  setUserInfo,
  getUserInfo,
  removeUserInfo,
  isAuthenticated,
  shouldRefreshToken,
  refreshToken,
  logout,
  handleLoginSuccess,
  hasPermission,
  hasRole,
  getUserMenus,
  getUserButtons,
};
