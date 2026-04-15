import { SetMetadata } from "@nestjs/common";

/**
 * 事务配置接口
 */
export interface TransactionOptions {
  isolationLevel?:
    | "READ_UNCOMMITTED"
    | "READ_COMMITTED"
    | "REPEATABLE_READ"
    | "SERIALIZABLE";
  timeout?: number; // 事务超时时间（毫秒）
  readOnly?: boolean; // 只读事务
}

export const TRANSACTION_KEY = "transaction";

/**
 * 事务装饰器
 * 确保多表操作的原子性
 *
 * @example
 * @Transaction({ isolationLevel: 'REPEATABLE_READ', timeout: 30000 })
 * async createUserWithRole(userData: any, roleData: any) {
 *   // 多表操作，要么全部成功，要么全部失败
 *   const user = await this.prisma.user.create({ data: userData });
 *   await this.prisma.userRole.create({
 *     data: { userId: user.id, ...roleData }
 *   });
 *   return user;
 * }
 */
export const Transaction = (options?: TransactionOptions) =>
  SetMetadata(TRANSACTION_KEY, options || {});
