/**
 * 权限管理相关常量配置
 */

/**
 * 操作类型映射
 */
export const OPERATION_TYPE_MAP: Record<
  string,
  { label: string; color: string }
> = {
  create: { label: "创建", color: "green" },
  update: { label: "更新", color: "blue" },
  delete: { label: "删除", color: "red" },
  assign: { label: "分配权限", color: "purple" },
  revoke: { label: "取消权限", color: "orange" },
  batch_assign: { label: "批量分配", color: "cyan" },
  batch_revoke: { label: "批量取消", color: "magenta" },
  template_apply: { label: "应用模板", color: "geekblue" },
  template_create: { label: "创建模板", color: "green" },
  template_update: { label: "更新模板", color: "blue" },
  template_delete: { label: "删除模板", color: "red" },
  template_copy: { label: "复制模板", color: "cyan" },
  template_export: { label: "导出模板", color: "purple" },
  template_import: { label: "导入模板", color: "orange" },
};

/**
 * 权限类型
 */
export enum PermissionType {
  MENU = "menu",
  BUTTON = "button",
  API = "api",
}

/**
 * 权限类型标签映射
 */
export const PERMISSION_TYPE_MAP: Record<
  PermissionType,
  { label: string; color: string }
> = {
  [PermissionType.MENU]: { label: "菜单", color: "blue" },
  [PermissionType.BUTTON]: { label: "按钮", color: "green" },
  [PermissionType.API]: { label: "API", color: "orange" },
};

/**
 * 模板类型
 */
export enum TemplateType {
  SYSTEM = "system",
  CUSTOM = "custom",
}

/**
 * 模板类型标签映射
 */
export const TEMPLATE_TYPE_MAP: Record<
  TemplateType,
  { label: string; color: string }
> = {
  [TemplateType.SYSTEM]: { label: "系统模板", color: "blue" },
  [TemplateType.CUSTOM]: { label: "自定义模板", color: "green" },
};

/**
 * 模板分类
 */
export const TEMPLATE_CATEGORIES = [
  { label: "管理类", value: "管理类" },
  { label: "业务类", value: "业务类" },
  { label: "查看类", value: "查看类" },
  { label: "操作类", value: "操作类" },
  { label: "审批类", value: "审批类" },
  { label: "财务类", value: "财务类" },
  { label: "人事类", value: "人事类" },
  { label: "客服类", value: "客服类" },
];

/**
 * 快捷键配置
 */
export const HOTKEY_CONFIG = {
  SAVE: { key: "s", ctrl: true, description: "保存" },
  UNDO: { key: "z", ctrl: true, description: "撤销" },
  REDO: { key: "y", ctrl: true, description: "重做" },
  RESET: { key: "r", ctrl: true, description: "重置" },
  NEW: { key: "n", ctrl: true, description: "新建" },
  SEARCH: { key: "f", ctrl: true, description: "搜索" },
  SELECT_ALL: { key: "a", ctrl: true, description: "全选" },
  DELETE: { key: "Delete", ctrl: false, description: "删除" },
};

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  PERMISSION_TREE: {
    KEY: "permission_tree",
    TTL: 5 * 60 * 1000, // 5分钟
  },
  OPERATION_STATE: {
    KEY_PREFIX: "operation_state_",
    TTL: 5 * 60 * 1000, // 5分钟
  },
  SEARCH_HISTORY: {
    KEY: "search_history",
    MAX_COUNT: 10,
  },
  TEMPLATE_LIST: {
    KEY: "template_list",
    TTL: 10 * 60 * 1000, // 10分钟
  },
};

/**
 * 批量操作配置
 */
export const BATCH_OPERATION_CONFIG = {
  MAX_BATCH_SIZE: 100, // 最大批量操作数量
  PROGRESS_UPDATE_INTERVAL: 100, // 进度更新间隔（毫秒）
  HISTORY_RETENTION: 24 * 60 * 60 * 1000, // 历史记录保留时间（24小时）
};

/**
 * 拖拽配置
 */
export const DRAG_CONFIG = {
  ANIMATION_DURATION: 200, // 动画持续时间（毫秒）
  SCROLL_SPEED: 10, // 滚动速度
  SCROLL_THRESHOLD: 50, // 滚动触发阈值（像素）
};

/**
 * 权限优先级
 */
export enum PermissionPriority {
  HIGH = "high",
  MEDIUM = "medium",
  LOW = "low",
}

/**
 * 权限优先级映射
 */
export const PERMISSION_PRIORITY_MAP: Record<
  PermissionPriority,
  { label: string; color: string }
> = {
  [PermissionPriority.HIGH]: { label: "高", color: "red" },
  [PermissionPriority.MEDIUM]: { label: "中", color: "orange" },
  [PermissionPriority.LOW]: { label: "低", color: "blue" },
};

/**
 * 根据位置计算权限优先级
 */
export function calculatePriority(index: number): PermissionPriority {
  if (index < 3) return PermissionPriority.HIGH;
  if (index < 6) return PermissionPriority.MEDIUM;
  return PermissionPriority.LOW;
}

/**
 * 操作状态
 */
export enum OperationStatus {
  SUCCESS = "success",
  FAILED = "failed",
  PENDING = "pending",
}

/**
 * 操作状态映射
 */
export const OPERATION_STATUS_MAP: Record<
  OperationStatus,
  { label: string; color: string }
> = {
  [OperationStatus.SUCCESS]: { label: "成功", color: "success" },
  [OperationStatus.FAILED]: { label: "失败", color: "error" },
  [OperationStatus.PENDING]: { label: "处理中", color: "processing" },
};

/**
 * 默认分页配置
 */
export const DEFAULT_PAGINATION = {
  current: 1,
  pageSize: 20,
  showSizeChanger: true,
  showQuickJumper: true,
  showTotal: (total: number) => `共 ${total} 条`,
  pageSizeOptions: ["10", "20", "50", "100"],
};

/**
 * 表格滚动配置
 */
export const TABLE_SCROLL = {
  x: 1200,
  y: 600,
};

/**
 * 消息提示配置
 */
export const MESSAGE_CONFIG = {
  duration: 3, // 持续时间（秒）
  maxCount: 3, // 最大显示数量
};

/**
 * 模态框配置
 */
export const MODAL_CONFIG = {
  width: 800,
  maskClosable: false,
  destroyOnClose: true,
};

/**
 * 权限模块主题色
 */
export const PERMISSION_THEME = {
  PRIMARY: "#667eea",
  SECONDARY: "#764ba2",
  GRADIENT: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
};

/**
 * 错误消息
 */
export const ERROR_MESSAGES = {
  NETWORK_ERROR: "网络错误，请检查网络连接",
  PERMISSION_DENIED: "权限不足，无法执行此操作",
  OPERATION_FAILED: "操作失败，请稍后重试",
  VALIDATION_FAILED: "数据验证失败，请检查输入",
  TEMPLATE_NOT_FOUND: "模板不存在",
  ROLE_NOT_FOUND: "角色不存在",
  PERMISSION_NOT_FOUND: "权限不存在",
  DUPLICATE_NAME: "名称已存在",
  SYSTEM_TEMPLATE_READONLY: "系统默认模板不可修改",
  BATCH_SIZE_EXCEEDED: `批量操作数量不能超过 ${BATCH_OPERATION_CONFIG.MAX_BATCH_SIZE} 个`,
};

/**
 * 成功消息
 */
export const SUCCESS_MESSAGES = {
  SAVE_SUCCESS: "保存成功",
  DELETE_SUCCESS: "删除成功",
  CREATE_SUCCESS: "创建成功",
  UPDATE_SUCCESS: "更新成功",
  COPY_SUCCESS: "复制成功",
  EXPORT_SUCCESS: "导出成功",
  IMPORT_SUCCESS: "导入成功",
  APPLY_SUCCESS: "应用成功",
  ASSIGN_SUCCESS: "分配成功",
  REVOKE_SUCCESS: "取消成功",
  UNDO_SUCCESS: "撤销成功",
  REDO_SUCCESS: "重做成功",
};
