import { Modal, message } from 'antd';
import { ExclamationCircleOutlined } from '@ant-design/icons';

/**
 * 批量删除确认对话框
 * @param count 选中的记录数量
 * @param onConfirm 确认回调
 * @param itemName 项目名称（如 "记录"、"员工"）
 */
export const confirmBatchDelete = (
  count: number,
  onConfirm: () => Promise<void>,
  itemName: string = "记录"
) => {
  if (count === 0) {
    message.warning(`请先选择要删除的${itemName}`);
    return;
  }

  Modal.confirm({
    title: "确认批量删除",
    icon: <ExclamationCircleOutlined />,
    content: `确定要删除选中的 ${count} 条${itemName}吗？此操作不可恢复。`,
    okText: "确认删除",
    okType: "danger",
    cancelText: "取消",
    onOk: async () => {
      try {
        await onConfirm();
        message.success(`成功删除 ${count} 条${itemName}`);
      } catch (error) {
        message.error("删除失败，请重试");
        throw error;
      }
    },
  });
};

/**
 * 批量操作确认对话框（通用）
 * @param count 选中的记录数量
 * @param action 操作名称（如 "导出"、"启用"）
 * @param onConfirm 确认回调
 * @param itemName 项目名称
 */
export const confirmBatchAction = (
  count: number,
  action: string,
  onConfirm: () => Promise<void>,
  itemName: string = "记录"
) => {
  if (count === 0) {
    message.warning(`请先选择要${action}的${itemName}`);
    return;
  }

  Modal.confirm({
    title: `确认批量${action}`,
    icon: <ExclamationCircleOutlined />,
    content: `确定要${action}选中的 ${count} 条${itemName}吗？`,
    okText: `确认${action}`,
    cancelText: "取消",
    onOk: async () => {
      try {
        await onConfirm();
        message.success(`成功${action} ${count} 条${itemName}`);
      } catch (error) {
        message.error(`${action}失败，请重试`);
        throw error;
      }
    },
  });
};

/**
 * 导出数据时显示加载提示
 * @param exportFn 导出函数
 * @param filename 文件名
 */
export const handleExportWithProgress = async (
  exportFn: () => Promise<void>,
  filename?: string
) => {
  const hide = message.loading(
    filename ? `正在导出 ${filename}...` : "正在导出数据...",
    0
  );
  try {
    await exportFn();
    hide();
    message.success("导出成功");
  } catch (error) {
    hide();
    message.error("导出失败，请重试");
    throw error;
  }
};

/**
 * 保存列配置到本地存储
 * @param key 存储键名
 * @param columns 列配置
 */
export const saveColumnConfig = (key: string, columns: any[]) => {
  try {
    localStorage.setItem(key, JSON.stringify(columns));
  } catch (e) {
    console.error('[ColumnConfig] 保存列配置失败', e);
  }
};

/**
 * 从本地存储加载列配置
 * @param key 存储键名
 * @param defaultColumns 默认列配置
 * @returns 列配置
 */
export const loadColumnConfig = (key: string, defaultColumns: any[]) => {
  try {
    const saved = localStorage.getItem(key);
    if (saved) {
      return JSON.parse(saved);
    }
  } catch (e) {
    console.error('[ColumnConfig] 加载列配置失败', e);
  }
  return defaultColumns;
};

/**
 * 重置列配置
 * @param key 存储键名
 * @param defaultColumns 默认列配置
 * @param setColumns 设置列配置的函数
 */
export const resetColumnConfig = (
  key: string,
  defaultColumns: any[],
  setColumns: (columns: any[]) => void
) => {
  setColumns(defaultColumns);
  saveColumnConfig(key, defaultColumns);
  message.success("已重置为默认列配置");
};
