/**
 * Hooks 统一导出
 */

export { useDebounce } from "./useDebounce";
export { useThrottle, useSimpleThrottle } from "./useThrottle";
export { useFormDraft } from "./useFormDraft";
export { useAutoSave } from "./useAutoSave";
export { useKeyboardShortcuts } from "./useKeyboardShortcuts";
export { useTheme } from "./useTheme";
export { useInlineEdit } from "./useInlineEdit";
export { useResponsive, useResponsiveColumns } from "./useResponsive";

// Quality Prompt Hooks
export { useGlobalPrompts } from "./useGlobalPrompts";
export { useDepartmentPrompts } from "./useDepartmentPrompts";
export { usePromptTemplates } from "./usePromptTemplates";

// Performance Optimization Hooks (Task 16)
export { useVirtualScroll, getVirtualScrollConfig, calculateVirtualScrollHeight } from "./useVirtualScroll";
export {
  useOperationLogQuery,
  useLoginLogQuery,
  useLogExport,
  useInvalidateLogCache,
  usePrefetchLogs
} from "./useLogQuery";
