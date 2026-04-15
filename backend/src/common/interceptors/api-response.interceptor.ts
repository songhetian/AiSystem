import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpStatus,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { map } from "rxjs/operators";

/**
 * 标准化API响应格式
 *
 * 统一响应格式：
 * {
 *   code: 200,
 *   message: "操作成功",
 *   data: {}
 * }
 */
export interface ApiResponse<T> {
  code: number;
  message: string;
  data: T;
  timestamp?: string;
  path?: string;
}

@Injectable()
export class ApiResponseInterceptor<T> implements NestInterceptor<
  T,
  ApiResponse<T>
> {
  intercept(
    context: ExecutionContext,
    next: CallHandler,
  ): Observable<ApiResponse<T>> {
    const request = context.switchToHttp().getRequest();
    const statusCode = context.switchToHttp().getResponse().statusCode;

    return next.handle().pipe(
      map((data) => {
        // 如果数据已经是标准格式，直接返回
        if (
          data &&
          typeof data === "object" &&
          "code" in data &&
          "message" in data
        ) {
          return data as ApiResponse<T>;
        }

        // 否则包装成标准格式
        return {
          code: statusCode || HttpStatus.OK,
          message: this.getDefaultMessage(statusCode),
          data: data || null,
          timestamp: new Date().toISOString(),
          path: request.url,
        };
      }),
    );
  }

  /**
   * 获取默认提示信息
   */
  private getDefaultMessage(statusCode: number): string {
    const messages: Record<number, string> = {
      [HttpStatus.OK]: "操作成功",
      [HttpStatus.CREATED]: "创建成功",
      [HttpStatus.NO_CONTENT]: "删除成功",
      [HttpStatus.BAD_REQUEST]: "请求参数错误",
      [HttpStatus.UNAUTHORIZED]: "未授权",
      [HttpStatus.FORBIDDEN]: "无权限访问",
      [HttpStatus.NOT_FOUND]: "资源不存在",
      [HttpStatus.TOO_MANY_REQUESTS]: "请求过于频繁",
      [HttpStatus.INTERNAL_SERVER_ERROR]: "服务器内部错误",
      [HttpStatus.SERVICE_UNAVAILABLE]: "服务暂时不可用",
    };

    return messages[statusCode] || "操作成功";
  }
}
