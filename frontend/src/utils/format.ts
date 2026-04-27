/**
 * 格式化工具函数
 */

import dayjs from 'dayjs';

/**
 * 格式化日期时间
 * @param date 日期字符串或Date对象
 * @param format 格式化模板，默认 'YYYY-MM-DD HH:mm:ss'
 * @returns 格式化后的日期字符串
 */
export const formatDate = (
  date: string | Date | null | undefined,
  format: string = 'YYYY-MM-DD HH:mm:ss'
): string => {
  if (!date) return '-';
  return dayjs(date).format(format);
};

/**
 * 格式化日期（不含时间）
 * @param date 日期字符串或Date对象
 * @returns 格式化后的日期字符串
 */
export const formatDateOnly = (date: string | Date | null | undefined): string => {
  return formatDate(date, 'YYYY-MM-DD');
};

/**
 * 格式化时间（不含日期）
 * @param date 日期字符串或Date对象
 * @returns 格式化后的时间字符串
 */
export const formatTimeOnly = (date: string | Date | null | undefined): string => {
  return formatDate(date, 'HH:mm:ss');
};

/**
 * 格式化相对时间
 * @param date 日期字符串或Date对象
 * @returns 相对时间字符串（如：刚刚、5分钟前、2小时前）
 */
export const formatRelativeTime = (date: string | Date | null | undefined): string => {
  if (!date) return '-';

  const now = dayjs();
  const target = dayjs(date);
  const diff = now.diff(target, 'second');

  if (diff < 60) return '刚刚';
  if (diff < 3600) return `${Math.floor(diff / 60)}分钟前`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}小时前`;
  if (diff < 2592000) return `${Math.floor(diff / 86400)}天前`;
  if (diff < 31536000) return `${Math.floor(diff / 2592000)}个月前`;
  return `${Math.floor(diff / 31536000)}年前`;
};

/**
 * 格式化文件大小
 * @param bytes 字节数
 * @param decimals 小数位数，默认2
 * @returns 格式化后的文件大小字符串（如：1.23 MB）
 */
export const formatFileSize = (bytes: number | null | undefined, decimals: number = 2): string => {
  if (bytes === null || bytes === undefined) return '-';
  if (bytes === 0) return '0 Bytes';

  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB', 'PB'];

  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

/**
 * 格式化数字（千分位）
 * @param num 数字
 * @param decimals 小数位数，默认0
 * @returns 格式化后的数字字符串（如：1,234,567.89）
 */
export const formatNumber = (num: number | null | undefined, decimals: number = 0): string => {
  if (num === null || num === undefined) return '-';

  return num.toLocaleString('zh-CN', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
};

/**
 * 格式化百分比
 * @param value 数值（0-1之间）
 * @param decimals 小数位数，默认2
 * @returns 格式化后的百分比字符串（如：12.34%）
 */
export const formatPercent = (value: number | null | undefined, decimals: number = 2): string => {
  if (value === null || value === undefined) return '-';

  return (value * 100).toFixed(decimals) + '%';
};

/**
 * 格式化货币
 * @param amount 金额
 * @param currency 货币符号，默认 '¥'
 * @param decimals 小数位数，默认2
 * @returns 格式化后的货币字符串（如：¥1,234.56）
 */
export const formatCurrency = (
  amount: number | null | undefined,
  currency: string = '¥',
  decimals: number = 2
): string => {
  if (amount === null || amount === undefined) return '-';

  return currency + formatNumber(amount, decimals);
};

/**
 * 格式化手机号（隐藏中间4位）
 * @param phone 手机号
 * @returns 格式化后的手机号（如：138****5678）
 */
export const formatPhone = (phone: string | null | undefined): string => {
  if (!phone) return '-';

  return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
};

/**
 * 格式化身份证号（隐藏中间部分）
 * @param idCard 身份证号
 * @returns 格式化后的身份证号（如：110***********1234）
 */
export const formatIdCard = (idCard: string | null | undefined): string => {
  if (!idCard) return '-';

  return idCard.replace(/(\d{3})\d+(\d{4})/, '$1***********$2');
};

/**
 * 格式化银行卡号（每4位一组）
 * @param cardNo 银行卡号
 * @returns 格式化后的银行卡号（如：6222 **** **** 1234）
 */
export const formatBankCard = (cardNo: string | null | undefined): string => {
  if (!cardNo) return '-';

  return cardNo.replace(/(\d{4})(?=\d)/g, '$1 ');
};

/**
 * 截断文本
 * @param text 文本
 * @param maxLength 最大长度
 * @param suffix 后缀，默认 '...'
 * @returns 截断后的文本
 */
export const truncateText = (
  text: string | null | undefined,
  maxLength: number,
  suffix: string = '...'
): string => {
  if (!text) return '-';
  if (text.length <= maxLength) return text;

  return text.substring(0, maxLength) + suffix;
};

/**
 * 格式化枚举值
 * @param value 枚举值
 * @param enumMap 枚举映射表
 * @returns 枚举对应的文本
 */
export const formatEnum = <T extends string | number>(
  value: T | null | undefined,
  enumMap: Record<T, string>
): string => {
  if (value === null || value === undefined) return '-';

  return enumMap[value] || String(value);
};

/**
 * 格式化布尔值
 * @param value 布尔值
 * @param trueText 真值文本，默认 '是'
 * @param falseText 假值文本，默认 '否'
 * @returns 格式化后的文本
 */
export const formatBoolean = (
  value: boolean | null | undefined,
  trueText: string = '是',
  falseText: string = '否'
): string => {
  if (value === null || value === undefined) return '-';

  return value ? trueText : falseText;
};

/**
 * 格式化数组为字符串
 * @param arr 数组
 * @param separator 分隔符，默认 '、'
 * @returns 格式化后的字符串
 */
export const formatArray = (
  arr: any[] | null | undefined,
  separator: string = '、'
): string => {
  if (!arr || arr.length === 0) return '-';

  return arr.join(separator);
};

/**
 * 格式化时长（秒转换为时分秒）
 * @param seconds 秒数
 * @returns 格式化后的时长字符串（如：1小时23分45秒、23分45秒、45秒）
 */
export const formatDuration = (seconds: number | null | undefined): string => {
  if (seconds === null || seconds === undefined || seconds < 0) return '-';

  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);

  if (hours > 0) {
    return `${hours}小时${minutes}分${secs}秒`;
  } else if (minutes > 0) {
    return `${minutes}分${secs}秒`;
  } else {
    return `${secs}秒`;
  }
};

/**
 * 格式化JSON
 * @param json JSON对象或字符串
 * @param indent 缩进空格数，默认2
 * @returns 格式化后的JSON字符串
 */
export const formatJSON = (json: any, indent: number = 2): string => {
  if (!json) return '-';

  try {
    const obj = typeof json === 'string' ? JSON.parse(json) : json;
    return JSON.stringify(obj, null, indent);
  } catch (error) {
    return String(json);
  }
};
