/**
 * 日志系统通知测试
 * Task 17.3: 测试用户友好提示
 * Requirements: 14.2, 14.3, 14.4, 18.1
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { message, notification } from 'antd';
import {
  showDateCorrectionNotification,
  showKeywordTruncationNotification,
  showLargeDataExportWarning,
  showNoDataToExportWarning,
  showLogExportSuccess,
  showPermissionDeniedNotification,
  showNetworkErrorNotification,
  showServerErrorNotification,
} from '@/utils/logNotifications';

// Mock antd
vi.mock('antd', () => ({
  message: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
    loading: vi.fn(),
  },
  notification: {
    error: vi.fn(),
    warning: vi.fn(),
    info: vi.fn(),
    success: vi.fn(),
  },
}));

describe('日志系统通知', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('自动修正提示', () => {
    it('应该显示日期范围修正通知', () => {
      showDateCorrectionNotification();

      expect(notification.info).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '日期范围已自动修正',
        })
      );
    });

    it('应该显示关键词截断通知', () => {
      showKeywordTruncationNotification(100, 50);

      expect(notification.warning).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '搜索关键词过长',
          description: expect.stringContaining('100'),
        })
      );
    });
  });

  describe('导出相关通知', () => {
    it('应该显示导出成功通知', () => {
      showLogExportSuccess('test.xlsx');

      expect(notification.success).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '导出成功',
          description: expect.stringContaining('test.xlsx'),
        })
      );
    });

    it('应该显示大数据量导出警告', () => {
      showLargeDataExportWarning(150000, 100000);

      expect(notification.warning).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '数据量过大',
          description: expect.stringContaining('150,000'),
        })
      );
    });

    it('应该显示无数据导出警告', () => {
      showNoDataToExportWarning();

      expect(message.warning).toHaveBeenCalledWith(
        expect.stringContaining('没有可导出的数据')
      );
    });
  });

  describe('错误通知', () => {
    it('应该显示权限不足通知', () => {
      showPermissionDeniedNotification('查看日志');

      expect(notification.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '权限不足',
          description: expect.stringContaining('查看日志'),
        })
      );
    });

    it('应该显示网络错误通知', () => {
      showNetworkErrorNotification();

      expect(notification.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '网络连接失败',
        })
      );
    });

    it('应该显示服务器错误通知', () => {
      showServerErrorNotification();

      expect(notification.error).toHaveBeenCalledWith(
        expect.objectContaining({
          message: '服务器错误',
        })
      );
    });
  });
});
