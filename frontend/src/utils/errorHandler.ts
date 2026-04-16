import { message } from "antd";
import { ERROR_MESSAGES } from "@/constants/permission";

/**
 * 错误类型
 */
export enum ErrorType {
  NETWORK = "NETWORK",
  PERMISSION = "PERMISSION",
  VALIDATION = "VALIDATION",
  BUSINESS = "BUSINESS",
  UNKNOWN = "UNKNOWN",
}

/**
 * 错误信息接口
 */
export interface ErrorInfo {
  type: ErrorType;
  code?: string;
  message: string;
  details?: any;
}

/**
 * 解析错误
 */
export function parseError(error: any): ErrorInfo {
  // 网络错误
  if (!error.response) {
    return {
      type: ErrorType.NETWORK,
      message: ERROR_MESSAGES.NETWORK_ERROR,
    };
  }

  const { status, data } = error.response;

  // 权限错误
  if (status === 403) {
    return {
      type: ErrorType.PERMISSION,
      code: data?.code,
      message: data?.message || ERROR_MESSAGES.PERMISSION_DENIED,
    };
  }

  // 验证错误
  if (status === 400) {
    return {
      type: ErrorType.VALIDATION,
      code: data?.code,
      message: data?.message || ERROR_MESSAGES.VALIDATION_FAILED,
      details: data?.details,
    };
  }

  // 业务错误
  if (status >= 400 && status < 500) {
    return {
      type: ErrorType.BUSINESS,
      code: data?.code,
      message: data?.message || ERROR_MESSAGES.OPERATION_FAILED,
    };
  }

  // 服务器错误
  if (status >= 500) {
    return {
      type: ErrorType.UNKNOWN,
      message: "服务器错误，请稍后重试",
    };
  }

  // 未知错误
  return {
    type: ErrorType.UNKNOWN,
    message: error.message || ERROR_MESSAGES.OPERATION_FAILED,
  };
}

/**
 * 处理错误
 */
export function handleError(error: any, customMessage?: string): void {
  const errorInfo = parseError(error);

  // 显示错误消息
  message.error(customMessage || errorInfo.message);

  // 记录错误日志
  console.error("[Error]", errorInfo);

  // 可以在这里添加错误上报逻辑
  // reportError(errorInfo);
}

/**
 * 错误边界处理
 */
export function withErrorHandler<T extends (...args: any[]) => Promise<any>>(
  fn: T,
  errorMessage?: string,
): T {
  return (async (...args: any[]) => {
    try {
      return await fn(...args);
    } catch (error) {
      handleError(error, errorMessage);
      throw error;
    }
  }) as T;
}

/**
 * 批量操作错误处理
 */
export interface BatchErrorResult {
  successCount: number;
  failedCount: number;
  errors: Array<{
    id: string;
    name: string;
    error: string;
  }>;
}

export function handleBatchErrors(
  results: Array<{
    id: string;
    name: string;
    status: string;
    message?: string;
  }>,
): BatchErrorResult {
  const successCount = results.filter((r) => r.status === "success").length;
  const failedCount = results.filter((r) => r.status === "failed").length;
  const errors = results
    .filter((r) => r.status === "failed")
    .map((r) => ({
      id: r.id,
      name: r.name,
      error: r.message || "操作失败",
    }));

  return {
    successCount,
    failedCount,
    errors,
  };
}

/**
 * 显示批量操作结果
 */
export function showBatchResult(result: BatchErrorResult): void {
  if (result.failedCount === 0) {
    message.success(`批量操作成功：${result.successCount} 项`);
  } else if (result.successCount === 0) {
    message.error(`批量操作失败：${result.failedCount} 项`);
  } else {
    message.warning(
      `批量操作完成：成功 ${result.successCount} 项，失败 ${result.failedCount} 项`,
    );
  }
}

/**
 * 验证错误处理
 */
export function handleValidationError(errors: Record<string, string[]>): void {
  const firstError = Object.values(errors)[0]?.[0];
  if (firstError) {
    message.error(firstError);
  }
}

/**
 * 重试机制
 */
export async function retryOperation<T>(
  operation: () => Promise<T>,
  maxRetries: number = 3,
  delay: number = 1000,
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;

      // 如果是权限错误或验证错误，不重试
      const errorInfo = parseError(error);
      if (
        errorInfo.type === ErrorType.PERMISSION ||
        errorInfo.type === ErrorType.VALIDATION
      ) {
        throw error;
      }

      // 最后一次重试失败，抛出错误
      if (i === maxRetries - 1) {
        throw error;
      }

      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
    }
  }

  throw lastError;
}

/**
 * 错误恢复建议
 */
export function getRecoverySuggestion(errorInfo: ErrorInfo): string {
  switch (errorInfo.type) {
    case ErrorType.NETWORK:
      return "请检查网络连接后重试";
    case ErrorType.PERMISSION:
      return "请联系管理员获取相应权限";
    case ErrorType.VALIDATION:
      return "请检查输入数据是否正确";
    case ErrorType.BUSINESS:
      return "请稍后重试或联系技术支持";
    default:
      return "请刷新页面后重试";
  }
}
