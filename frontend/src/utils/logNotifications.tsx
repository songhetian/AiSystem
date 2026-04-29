/**
 * 日志系统通知工具
 * Task 17.3: 实现用户友好提示 - 操作成功/失败提示、异常自动修正提示
 * Requirements: 14.2, 14.3, 14.4, 18.1
 *
 * 提供日志操作的各种通知提示
 */

import { message, notification } from 'antd';
import {
  CheckCircleOutlined,
  ExclamationCircleOutlined,
  InfoCircleOutlined,
  WarningOutlined,
} from '@ant-design/icons';

/**
 * 成功通知
 */
export const showSuccessNotification = (
  title: string,
  description?: string,
  duration: number = 3,
) => {
  notification.success({
    message: title,
    description,
    icon: <CheckCircleOutlined style={{ color: '#52c41a' }} />,
    duration,
    placement: 'topRight',
  });
};

/**
 * 错误通知
 */
export const showErrorNotification = (
  title: string,
  description?: string,
  duration: number = 4,
) => {
  notification.error({
    message: title,
    description,
    icon: <ExclamationCircleOutlined style={{ color: '#ff4d4f' }} />,
    duration,
    placement: 'topRight',
  });
};

/**
 * 警告通知
 */
export const showWarningNotification = (
  title: string,
  description?: string,
  duration: number = 4,
) => {
  notification.warning({
    message: title,
    description,
    icon: <WarningOutlined style={{ color: '#faad14' }} />,
    duration,
    placement: 'topRight',
  });
};

/**
 * 信息通知
 */
export const showInfoNotification = (
  title: string,
  description?: string,
  duration: number = 3,
) => {
  notification.info({
    message: title,
    description,
    icon: <InfoCircleOutlined style={{ color: '#1890ff' }} />,
    duration,
    placement: 'topRight',
  });
};

/**
 * 日志查询成功提示
 */
export const showLogQuerySuccess = (count: number) => {
  message.success(`查询成功，共找到 ${count} 条日志记录`);
};

/**
 * 日志导出成功提示
 */
export const showLogExportSuccess = (filename?: string) => {
  showSuccessNotification(
    '导出成功',
    filename ? `文件 ${filename} 已保存到下载文件夹` : '文件已保存到下载文件夹',
  );
};

/**
 * 日志导出失败提示
 */
export const showLogExportError = (reason?: string) => {
  showErrorNotification(
    '导出失败',
    reason || '导出过程中发生错误，请稍后重试',
  );
};

/**
 * 日期范围自动修正提示
 * Requirement 14.2: 实现时间范围自动纠正提示
 */
export const showDateCorrectionNotification = () => {
  showInfoNotification(
    '日期范围已自动修正',
    '检测到开始日期晚于结束日期，已自动调整为正确的时间范围',
    4,
  );
};

/**
 * 关键词截断提示
 * Requirement 14.4: 实现关键词截取提示
 */
export const showKeywordTruncationNotification = (originalLength: number, maxLength: number = 50) => {
  showWarningNotification(
    '搜索关键词过长',
    `关键词长度为 ${originalLength} 个字符，已自动截取前 ${maxLength} 个字符进行搜索`,
    4,
  );
};

/**
 * 数据量过大提示
 * Requirement 18.1: 实现大数据量导出提示
 */
export const showLargeDataExportWarning = (count: number, limit: number = 100000) => {
  showWarningNotification(
    '数据量过大',
    `当前搜索结果有 ${count.toLocaleString()} 条记录，超过导出限制（${limit.toLocaleString()} 条）。建议缩小时间范围或添加更多筛选条件后分批导出。`,
    6,
  );
};

/**
 * 无数据可导出提示
 * Requirement 18.3: 实现无数据导出提示
 */
export const showNoDataToExportWarning = () => {
  message.warning('当前没有可导出的数据，请先进行搜索');
};

/**
 * 权限不足提示
 */
export const showPermissionDeniedNotification = (action: string = '执行此操作') => {
  showErrorNotification(
    '权限不足',
    `您没有权限${action}，请联系系统管理员申请相应权限`,
    5,
  );
};

/**
 * 网络错误提示
 */
export const showNetworkErrorNotification = () => {
  showErrorNotification(
    '网络连接失败',
    '请检查网络连接是否正常，或稍后再试',
    4,
  );
};

/**
 * 服务器错误提示
 */
export const showServerErrorNotification = () => {
  showErrorNotification(
    '服务器错误',
    '服务器遇到问题，请稍后重试或联系技术支持',
    4,
  );
};

/**
 * 加载超时提示
 */
export const showTimeoutNotification = () => {
  showWarningNotification(
    '请求超时',
    '数据加载时间过长，请检查网络连接或稍后再试',
    4,
  );
};

/**
 * 批量操作结果提示
 */
export const showBatchOperationResult = (
  successCount: number,
  failedCount: number,
  operation: string = '操作',
) => {
  if (failedCount === 0) {
    showSuccessNotification(
      `${operation}成功`,
      `成功${operation} ${successCount} 项`,
    );
  } else if (successCount === 0) {
    showErrorNotification(
      `${operation}失败`,
      `${failedCount} 项${operation}失败`,
    );
  } else {
    showWarningNotification(
      `${operation}部分成功`,
      `成功 ${successCount} 项，失败 ${failedCount} 项`,
    );
  }
};

/**
 * 搜索条件重置提示
 */
export const showSearchResetNotification = () => {
  message.info('搜索条件已重置');
};

/**
 * 数据刷新成功提示
 */
export const showDataRefreshSuccess = () => {
  message.success('数据已刷新');
};

/**
 * 页码自动修正提示
 * Requirement 16.1: 实现页码自动修正提示
 */
export const showPageCorrectionNotification = (invalidPage: number, correctedPage: number) => {
  showInfoNotification(
    '页码已自动修正',
    `页码 ${invalidPage} 超出范围，已自动跳转到第 ${correctedPage} 页`,
    3,
  );
};

/**
 * 导出进度提示
 */
export const showExportProgressNotification = (progress: number) => {
  if (progress === 100) {
    message.success('导出完成');
  } else {
    message.loading(`正在导出... ${progress}%`, 0);
  }
};

/**
 * 通用操作成功提示
 */
export const showOperationSuccess = (operation: string = '操作') => {
  message.success(`${operation}成功`);
};

/**
 * 通用操作失败提示
 */
export const showOperationError = (operation: string = '操作', reason?: string) => {
  message.error(reason || `${operation}失败，请稍后重试`);
};
