/**
 * 测试工具函数
 */

import { Test, TestingModule } from "@nestjs/testing";
import { PrismaService } from "../../src/prisma/prisma.service";

/**
 * 创建测试模块
 */
export async function createTestingModule(
  imports: any[],
  providers: any[] = [],
  controllers: any[] = [],
): Promise<TestingModule> {
  return await Test.createTestingModule({
    imports,
    controllers,
    providers: [
      ...providers,
      {
        provide: PrismaService,
        useValue: createMockPrismaService(),
      },
    ],
  }).compile();
}

/**
 * 创建 Mock Prisma Service
 */
export function createMockPrismaService() {
  return {
    $connect: jest.fn(),
    $disconnect: jest.fn(),
    $transaction: jest.fn((callback) => callback({})),
    $queryRaw: jest.fn(),
    $executeRaw: jest.fn(),
  };
}

/**
 * 创建 Mock 用户
 */
export function createMockUser(overrides: Partial<any> = {}) {
  return {
    sub: "test-user-id",
    username: "testuser",
    name: "Test User",
    platform_id: "test-platform",
    dept_id: "test-dept",
    shop_id: "test-shop",
    roles: ["admin"],
    ...overrides,
  };
}

/**
 * 创建 Mock Request
 */
export function createMockRequest(user: any = createMockUser()) {
  return {
    user,
    headers: {},
    query: {},
    params: {},
    body: {},
  };
}

/**
 * 创建 Mock Response
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

/**
 * 等待异步操作
 */
export function waitFor(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * 生成随机字符串
 */
export function randomString(length: number = 10): string {
  return Math.random()
    .toString(36)
    .substring(2, length + 2);
}

/**
 * 生成随机数字
 */
export function randomNumber(min: number = 0, max: number = 100): number {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}
