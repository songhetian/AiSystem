/**
 * 日志系统错误处理测试
 * Task 17.1: 测试全局错误处理
 * Requirements: 14.1, 14.2, 14.3, 16.2
 */

import { describe, it, expect, vi } from 'vitest';
import { message } from 'antd';
import {
  parseLogError,
  handleLogQueryError,
  handleLogExportError,
  shouldRetryLogRequest,
  LogErrorType,
} from '@/utils/logErrorHandler';

// Mock antd message
vi.mock('antd', () => ({
  message: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
  notification: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

describe('日志错误处理', () => {
  describe('parseLogError', () => {
    it('应该正确解析网络错误', () => {
      const error = { message: 'Network Error' };
      const result = parseLogError(error);

      expect(result.type).toBe(LogErrorType.NETWORK);
      expect(result.userMessage).toContain('网络连接失败');
    });

    it('应该正确解析超时错误', () => {
      const error = {
        code: 'ECONNABORTED',
        message: 'timeout of 30000ms exceeded',
      };
      const result = parseLogError(error);

      expect(result.type).toBe(LogErrorType.TIMEOUT);
      expect(result.userMessage).toContain('请求超时');
    });

    it('应该正确解析401权限错误', () => {
      const error = {
        response: {
          status: 401,
          data: { message: 'Unauthorized' },
        },
      };
      const result = parseLogError(error);

      expect(result.type).toBe(LogErrorType.PERMISSION);
      expect(result.code).toBe(401);
      expect(result.userMessage).toContain('登录已过期');
    });

    it('应该正确解析403权限错误', () => {
      const error = {
        response: {
          status: 403,
          data: { message: 'Forbidden' },
        },
      };
      const result = parseLogError(error);

      expect(result.type).toBe(LogErrorType.PERMISSION);
      expect(result.code).toBe(403);
      expect(result.userMessage).toContain('没有权限');
    });

    it('应该正确解析500服务器错误', () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Internal Server Error' },
        },
      };
      const result = parseLogError(error);

      expect(result.type).toBe(LogErrorType.SERVER);
      expect(result.code).toBe(500);
      expect(result.userMessage).toContain('服务器内部错误');
    });

    it('应该正确解析502网关错误', () => {
      const error = {
        response: {
          status: 502,
          data: { message: 'Bad Gateway' },
        },
      };
      const result = parseLogError(error);

      expect(result.type).toBe(LogErrorType.SERVER);
      expect(result.code).toBe(502);
      expect(result.userMessage).toContain('服务暂时不可用');
    });

    it('应该正确解析503服务不可用错误', () => {
      const error = {
        response: {
          status: 503,
          data: { message: 'Service Unavailable' },
        },
      };
      const result = parseLogError(error);

      expect(result.type).toBe(LogErrorType.SERVER);
      expect(result.code).toBe(503);
      expect(result.userMessage).toContain('服务暂时不可用');
    });
  });

  describe('handleLogQueryError', () => {
    it('应该显示查询错误提示', () => {
      const error = {
        response: {
          status: 500,
          data: { message: 'Server Error' },
        },
      };

      handleLogQueryError(error, 'search');

      expect(message.error).toHaveBeenCalled();
    });

    it('应该根据上下文定制错误消息', () => {
      const error = {
        response: {
          status: 404,
          data: { message: 'Not Found' },
        },
      };

      const result = handleLogQueryError(error, 'load');

      expect(result.userMessage).toContain('日志数据不存在');
    });
  });

  describe('handleLogExportError', () => {
    it('应该处理数据量过大错误', () => {
      const error = {
        response: {
          status: 400,
          data: { message: '数据量过大，超过10万条' },
        },
      };

      handleLogExportError(error);

      expect(message.warning).toHaveBeenCalled();
    });

    it('应该处理无匹配日志错误', () => {
      const error = {
        response: {
          status: 400,
          data: { message: '无匹配日志' },
        },
      };

      handleLogExportError(error);

      expect(message.warning).toHaveBeenCalled();
    });
  });

  describe('shouldRetryLogRequest', () => {
    it('网络错误应该重试', () => {
      const errorInfo = {
        type: LogErrorType.NETWORK,
        message: 'Network Error',
        userMessage: 'Network Error',
      };

      expect(shouldRetryLogRequest(errorInfo)).toBe(true);
    });

    it('超时错误应该重试', () => {
      const errorInfo = {
        type: LogErrorType.TIMEOUT,
        message: 'Timeout',
        userMessage: 'Timeout',
      };

      expect(shouldRetryLogRequest(errorInfo)).toBe(true);
    });

    it('权限错误不应该重试', () => {
      const errorInfo = {
        type: LogErrorType.PERMISSION,
        code: 403,
        message: 'Forbidden',
        userMessage: 'Forbidden',
      };

      expect(shouldRetryLogRequest(errorInfo)).toBe(false);
    });

    it('验证错误不应该重试', () => {
      const errorInfo = {
        type: LogErrorType.VALIDATION,
        code: 400,
        message: 'Bad Request',
        userMessage: 'Bad Request',
      };

      expect(shouldRetryLogRequest(errorInfo)).toBe(false);
    });

    it('502错误应该重试', () => {
      const errorInfo = {
        type: LogErrorType.SERVER,
        code: 502,
        message: 'Bad Gateway',
        userMessage: 'Bad Gateway',
      };

      expect(shouldRetryLogRequest(errorInfo)).toBe(true);
    });

    it('500错误不应该重试', () => {
      const errorInfo = {
        type: LogErrorType.SERVER,
        code: 500,
        message: 'Internal Server Error',
        userMessage: 'Internal Server Error',
      };

      expect(shouldRetryLogRequest(errorInfo)).toBe(false);
    });
  });
});
