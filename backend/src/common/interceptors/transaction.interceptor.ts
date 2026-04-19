import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import { Observable, throwError } from "rxjs";
import { PrismaClient, Prisma } from "@prisma/client";
import {
  TRANSACTION_KEY,
  TransactionOptions,
} from "../decorators/transaction.decorator";

/**
 * 事务拦截器
 * 自动管理数据库事务
 */
@Injectable()
export class TransactionInterceptor implements NestInterceptor {
  private readonly logger = new Logger(TransactionInterceptor.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly prisma: PrismaClient,
  ) {}

  async intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Promise<Observable<any>> {
    const options = this.reflector.get<TransactionOptions>(
      TRANSACTION_KEY,
      context.getHandler(),
    );

    if (!options) {
      return next.handle();
    }

    const handler = context.getHandler().name;
    const startTime = Date.now();

    this.logger.log(`Transaction started for ${handler}`);

    try {
      // 映射隔离级别
      const isolationLevelMap: Record<string, Prisma.TransactionIsolationLevel> = {
        READ_UNCOMMITTED: Prisma.TransactionIsolationLevel.ReadUncommitted,
        READ_COMMITTED: Prisma.TransactionIsolationLevel.ReadCommitted,
        REPEATABLE_READ: Prisma.TransactionIsolationLevel.RepeatableRead,
        SERIALIZABLE: Prisma.TransactionIsolationLevel.Serializable,
      };

      const isolationLevel = options.isolationLevel
        ? isolationLevelMap[options.isolationLevel]
        : undefined;

      // 使用Prisma事务
      const result = await this.prisma.$transaction(
        async (tx: any) => {
          // 将事务对象注入到请求中
          const request = context.switchToHttp().getRequest();
          request.transaction = tx;

          // 执行业务逻辑
          return await next.handle().toPromise();
        },
        {
          maxWait: options.timeout || 30000,
          timeout: options.timeout || 30000,
          isolationLevel,
        },
      );

      const duration = Date.now() - startTime;
      this.logger.log(
        `Transaction committed for ${handler}, duration: ${duration}ms`,
      );

      return new Observable((subscriber) => {
        subscriber.next(result);
        subscriber.complete();
      });
    } catch (error) {
      const duration = Date.now() - startTime;
      const errorMessage = error instanceof Error ? error.message : String(error);
      this.logger.error(
        `Transaction rolled back for ${handler}, duration: ${duration}ms, error: ${errorMessage}`,
      );

      return throwError(() => error);
    }
  }
}
