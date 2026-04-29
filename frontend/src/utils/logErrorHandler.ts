/**
 * 日志系统专用错误处理工具
 * Task 17.1: 实现全局错误处理
 * Requirements: 14.1, 14.2, 14.3, 16.2
 *
 * 提供日志查询和导出的错误处理功能
 */

import { message } from 'antd';
import { AxiosError } from 'axios';

/**
 * 日志错误类型
 */
export enum LogErrorType {
  NETWORK = 'NETWORK',           // 网络错误
  SERVER = 'SERVER',             // 服务器错误 (500, 502, 503)
  PERMISSION = 'PERMISSION',     // 权限错误 (401, 403)
  VALIDATION = 'VALIDATION',     // 验证错误 (400)
  NOT_FOUND = 'NOT_FOUND',       // 资源不存在 (404)
  TIMEOUT = 'TIMEOUT',           // 请求超时
  UNKNOWN = 'UNKNOWN',           // 未知错误
}

/**
 * 日志错误信息接口
 */
export interface LogErrorInfo {
  type: LogErrorType;
  code?: number;
  message: string;
  userMessage: string;  // 用户友好的错误提示
  suggestion?: string;  // 解决建议
  details?: any;
}

/**
 * 解析日志相关错误
 * Requirement 14.1, 14.2, 14.3: 处理网络错误、服务器错误、权限错误
 */
export function parseLogError(error: any): LogErrorInfo {
  // 1. 网络错误 (无响应)
  if (!error.response) {
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      return {
        type: LogErrorType.TIMEOUT,
        message: '请求超时',
        userMessage: '请求超时，请检查网络连接后重试',
        suggestion: '请检查网络连接是否正常，或稍后再试',
      };
    }

    return {
      type: LogErrorType.NETWORK,
      message: '网络连接失败',
      userMessage: '网络连接失败，请检查网络设置',
      suggestion: '请检查网络连接是否正常，或尝试刷新页面',
    };
  }

  const { status, data } = error.response;
  const errorMessage = data?.message || error.message || '操作失败';

  // 2. 权限错误 (401, 403)
  if (status === 401) {
    return {
      type: LogErrorType.PERMISSION,
      code: status,
      message: '未授权访问',
      userMessage: '登录已过期，请重新登录',
      suggestion: '请重新登录后再试',
      details: data,
    };
  }

  if (status === 403) {
    return {
      type: LogErrorType.PERMISSION,
      code: status,
      message: '权限不足',
      userMessage: '您没有权限查看日志，请联系管理员',
      suggestion: '请联系系统管理员申请日志查看权限',
      details: data,
    };
  }

  // 3. 验证错误 (400)
  if (status === 400) {
    return {
      type: LogErrorType.VALIDATION,
      code: status,
      message: errorMessage,
      userMessage: errorMessage,
      suggestion: '请检查搜索条件是否正确',
      details: data?.details,
    };
  }

  // 4. 资源不存在 (404)
  if (status === 404) {
    return {
      type: LogErrorType.NOT_FOUND,
      code: status,
      message: '资源不存在',
      userMessage: '请求的日志数据不存在',
      suggestion: '请刷新页面后重试',
    };
  }

  // 5. 服务器错误 (500, 502, 503)
  if (status === 500) {
    return {
      type: LogErrorType.SERVER,
      code: status,
      message: '服务器内部错误',
      userMessage: '服务器内部错误，请稍后重试',
      suggestion: '服务器遇到问题，请稍后再试或联系技术支持',
    };
  }

  if (status === 502) {
    return {
      type: LogErrorType.SERVER,
      code: status,
      message: '网关错误',
      userMessage: '服务暂时不可用，请稍后重试',
      suggestion: '服务正在维护或升级，请稍后再试',
    };
  }

  if (status === 503) {
    return {
      type: LogErrorType.SERVER,
      code: status,
      message: '服务不可用',
      userMessage: '服务暂时不可用，请稍后重试',
      suggestion: '服务器负载过高或正在维护，请稍后再试',
    };
  }

  // 6. 其他错误
  return {
    type: LogErrorType.UNKNOWN,
    code: status,
    message: errorMessage,
    userMessage: errorMessage || '操作失败，请稍后重试',
    suggestion: '请刷新页面后重试，如问题持续请联系技术支持',
  };
}

/**
 * 处理日志查询错误
 * Requirement 14.1, 14.2, 14.3: 实现用户友好的错误提示
 */
export function handleLogQueryError(error: any, context?: string): LogErrorInfo {
  const errorInfo = parseLogError(error);

  // 根据上下文定制错误消息
  let displayMessage = errorInfo.userMessage;
  if (context === 'search') {
    displayMessage = `搜索失败：${errorInfo.userMessage}`;
  } else if (context === 'load') {
    displayMessage = `加载日志失败：${errorInfo.userMessage}`;
  }

  // 显示错误提示
  if (errorInfo.type === LogErrorType.PERMISSION) {
    message.error({
      content: displayMessage,
      duration: 5,
    });
  } else if (errorInfo.type === LogErrorType.SERVER) {
    message.error({
      content: displayMessage,
      duration: 4,
    });
  } else if (errorInfo.type === LogErrorType.NETWORK || errorInfo.type === LogErrorType.TIMEOUT) {
    message.warning({
      content: displayMessage,
      duration: 4,
    });
  } else {
    message.error({
      content: displayMessage,
      duration: 3,
    });
  }

  // 记录错误日志
  console.error('[Log Query Error]', {
    type: errorInfo.type,
    code: errorInfo.code,
    message: errorInfo.message,
    context,
    timestamp: new Date().toISOString(),
  });

  return errorInfo;
}

/**
 * 处理日志导出错误
 * Requirement 18.1, 18.2, 18.3: 处理导出异常提示
 */
export function handleLogExportError(error: any): LogErrorInfo {
  const errorInfo = parseLogError(error);

  // 特殊处理导出相关错误
  let displayMessage = errorInfo.userMessage;
  let messageType: 'error' | 'warning' = 'error';

  // 数据量过大
  if (errorInfo.message?.includes('数据量过大') || errorInfo.message?.includes('超过10万')) {
    displayMessage = '数据量过大（超过10万条），建议分批次导出';
    messageType = 'warning';
  }
  // 无匹配日志
  else if (errorInfo.message?.includes('无匹配日志') || errorInfo.message?.includes('无数据')) {
    displayMessage = '无匹配日志，无法导出';
    messageType = 'warning';
  }
  // 导出失败
  else {
    displayMessage = `导出失败：${errorInfo.userMessage}`;
  }

  // 显示错误提示
  if (messageType === 'warning') {
    message.warning({
      content: displayMessage,
      duration: 5,
    });
  } else {
    message.error({
      content: displayMessage,
      duration: 4,
    });
  }

  // 记录错误日志
  console.error('[Log Export Error]', {
    type: errorInfo.type,
    code: errorInfo.code,
    message: errorInfo.message,
    timestamp: new Date().toISOString(),
  });

  return errorInfo;
}

/**
 * 处理分页错误
 * Requirement 16.2: 处理分页加载失败
 */
export function handleLogPaginationError(error: any): LogErrorInfo {
  const errorInfo = parseLogError(error);

  message.error({
    content: `加载失败：${errorInfo.userMessage}`,
    duration: 3,
  });

  console.error('[Log Pagination Error]', {
    type: errorInfo.type,
    code: errorInfo.code,
    message: errorInfo.message,
    timestamp: new Date().toISOString(),
  });

  return errorInfo;
}

/**
 * 获取错误恢复建议
 */
export function getLogErrorRecoverySuggestion(errorInfo: LogErrorInfo): string {
  return errorInfo.suggestion || '请刷新页面后重试';
}

/**
 * 判断是否需要重试
 */
export function shouldRetryLogRequest(errorInfo: LogErrorInfo): boolean {
  // 网络错误和超时错误可以重试
  if (errorInfo.type === LogErrorType.NETWORK || errorInfo.type === LogErrorType.TIMEOUT) {
    return true;
  }

  // 服务器错误 (502, 503) 可以重试
  if (errorInfo.type === LogErrorType.SERVER && (errorInfo.code === 502 || errorInfo.code === 503)) {
    return true;
  }

  // 权限错误、验证错误不应重试
  return false;
}

/**
 * 重试日志请求
 */
export async function retryLogRequest<T>(
  operation: () => Promise<T>,
  maxRetries: number = 2,
  delay: number = 1000,
): Promise<T> {
  let lastError: any;

  for (let i = 0; i < maxRetries; i++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      const errorInfo = parseLogError(error);

      // 如果不应该重试，直接抛出错误
      if (!shouldRetryLogRequest(errorInfo)) {
        throw error;
      }

      // 最后一次重试失败，抛出错误
      if (i === maxRetries - 1) {
        throw error;
      }

      // 等待后重试
      await new Promise((resolve) => setTimeout(resolve, delay * (i + 1)));
      console.log(`[Log Request] 重试第 ${i + 1} 次...`);
    }
  }

  throw lastError;
}
