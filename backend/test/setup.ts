/**
 * Jest 测试环境设置
 */

// 设置测试环境变量
process.env.NODE_ENV = "test";
process.env.DATABASE_URL =
  process.env.TEST_DATABASE_URL || "mysql://test:test@localhost:3306/test_db";

// 全局测试超时
jest.setTimeout(30000);

// Mock 全局对象
global.console = {
  ...console,
  // 在测试中禁用某些日志
  log: jest.fn(),
  debug: jest.fn(),
  info: jest.fn(),
  warn: jest.fn(),
  error: jest.fn(),
};
