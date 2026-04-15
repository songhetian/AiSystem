import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";

/**
 * HTTP异常过滤器
 * 统一处理所有HTTP异常，返回标准化错误响应
 */
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message = "服务器内部错误，请联系管理员";
    let errorDetail: any = null;

    // 处理HTTP异常
    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const exceptionResponse = exception.getResponse();

      if (typeof exceptionResponse === "string") {
        message = exceptionResponse;
      } else if (typeof exceptionResponse === "object") {
        const responseObj = exceptionResponse as any;
        message = responseObj.message || message;
        errorDetail = responseObj.error || null;
      }
    } else if (exception instanceof Error) {
      // 处理普通错误
      message = exception.message;
      errorDetail =
        process.env.NODE_ENV === "development" ? exception.stack : null;
    }

    // 记录错误日志
    this.logError(request, status, message, exception);

    // 返回标准化错误响应
    const errorResponse = {
      code: status,
      message: this.getFriendlyMessage(status, message),
      data: null,
      timestamp: new Date().toISOString(),
      path: request.url,
      ...(process.env.NODE_ENV === "development" && errorDetail
        ? { error: errorDetail }
        : {}),
    };

    response.status(status).json(errorResponse);
  }

  /**
   * 记录错误日志
   */
  private logError(
    request: Request,
    status: number,
    message: string,
    exception: unknown,
  ): void {
    const logMessage = `
      ========== HTTP Exception ==========
      Status: ${status}
      Message: ${message}
      Method: ${request.method}
      URL: ${request.url}
      IP: ${request.ip}
      User: ${(request as any).user?.id || "anonymous"}
      Time: ${new Date().toISOString()}
      ${exception instanceof Error ? `Stack: ${exception.stack}` : ""}
      ====================================
    `;

    if (status >= 500) {
      this.logger.error(logMessage);
    } else if (status >= 400) {
      this.logger.warn(logMessage);
    }
  }

  /**
   * 获取友好的错误提示信息
   */
  private getFriendlyMessage(status: number, originalMessage: string): string {
    // 系统异常不返回具体技术错误信息
    if (status >= 500) {
      const friendlyMessages: Record<number, string> = {
        [HttpStatus.INTERNAL_SERVER_ERROR]: "服务器内部错误，请联系管理员",
        [HttpStatus.BAD_GATEWAY]: "网关错误，请稍后再试",
        [HttpStatus.SERVICE_UNAVAILABLE]: "服务暂时不可用，请稍后再试",
        [HttpStatus.GATEWAY_TIMEOUT]: "网关超时，请稍后再试",
      };

      return friendlyMessages[status] || "服务器错误，请联系管理员";
    }

    // 客户端错误返回具体错误信息
    const friendlyMessages: Record<number, string> = {
      [HttpStatus.BAD_REQUEST]: "请求参数错误",
      [HttpStatus.UNAUTHORIZED]: "Token已过期或无效，请重新登录",
      [HttpStatus.FORBIDDEN]: "无权限访问该资源",
      [HttpStatus.NOT_FOUND]: "请求的资源不存在",
      [HttpStatus.METHOD_NOT_ALLOWED]: "请求方法不允许",
      [HttpStatus.CONFLICT]: "资源冲突",
      [HttpStatus.TOO_MANY_REQUESTS]: "请求过于频繁，请稍后再试",
    };

    return friendlyMessages[status] || originalMessage;
  }
}
