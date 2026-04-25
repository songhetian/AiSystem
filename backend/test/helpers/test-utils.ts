/**
 * 测试工具函数
 * 用于创建测试所需的mock数据
 */

/**
 * 创建模拟用户对象
 */
export function createMockUser(overrides?: Partial<MockUser>): MockUser {
  return {
    sub: overrides?.sub || 'test-user-id',
    username: overrides?.username || 'testuser',
    email: overrides?.email || 'test@example.com',
    roles: overrides?.roles || ['user'],
    permissions: overrides?.permissions || [],
    platform_id: overrides?.platform_id || 'test-platform',
    dept_id: overrides?.dept_id || 'test-dept',
    ...overrides,
  };
}

/**
 * 模拟用户类型
 */
export interface MockUser {
  sub: string;
  username: string;
  email: string;
  roles: string[];
  permissions: string[];
  platform_id?: string;
  dept_id?: string;
}

/**
 * 创建模拟请求对象
 */
export function createMockRequest(user?: MockUser) {
  return {
    user: user || createMockUser(),
    headers: {},
    query: {},
    params: {},
    body: {},
  };
}

/**
 * 创建模拟响应对象
 */
export function createMockResponse() {
  const res: any = {
    status: jest.fn().mockReturnThis(),
    json: jest.fn().mockReturnThis(),
    send: jest.fn().mockReturnThis(),
    setHeader: jest.fn().mockReturnThis(),
  };
  return res;
}
