import dayjs from 'dayjs';

/**
 * 格式化日期
 * @param date 日期字符串或Date对象
 * @param format 格式化模板，默认为 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期字符串
 */
export const formatDate = (
  date: string | Date,
  format: string = 'YYYY-MM-DD HH:mm:ss',
): string => {
  if (!date) return '';
  return dayjs(date).format(format);
};

/**
 * 获取相对时间描述（如：刚刚、5分钟前、2小时前等）
 * @param date 日期字符串或Date对象
 * @returns 相对时间描述
 */
export const getRelativeTime = (date: string | Date): string => {
  if (!date) return '';

  const now = dayjs();
  const target = dayjs(date);
  const diffInSeconds = now.diff(target, 'second');

  if (diffInSeconds < 60) {
    return '刚刚';
  } else if (diffInSeconds < 3600) {
    const minutes = Math.floor(diffInSeconds / 60);
    return `${minutes}分钟前`;
  } else if (diffInSeconds < 86400) {
    const hours = Math.floor(diffInSeconds / 3600);
    return `${hours}小时前`;
  } else if (diffInSeconds < 2592000) {
    const days = Math.floor(diffInSeconds / 86400);
    return `${days}天前`;
  } else {
    return target.format('YYYY-MM-DD');
  }
};

export default {
  formatDate,
  getRelativeTime,
};
