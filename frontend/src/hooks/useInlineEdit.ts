import { useState } from "react";
import { message } from "antd";

interface UseInlineEditOptions<T> {
  onSave: (id: string, field: string, value: any) => Promise<void>;
  onError?: (error: any) => void;
}

/**
 * 表格行内编辑Hook
 *
 * @param options - 配置选项
 * @returns 行内编辑相关的状态和方法
 *
 * @example
 * ```tsx
 * const { editingKey, editingField, startEdit, saveEdit, cancelEdit, isEditing } = useInlineEdit({
 *   onSave: async (id, field, value) => {
 *     await updateMutation.mutateAsync({ id, [field]: value });
 *   }
 * });
 *
 * // 在表格列中使用
 * {
 *   title: '名称',
 *   dataIndex: 'name',
 *   render: (text, record) => {
 *     if (isEditing(record.id, 'name')) {
 *       return (
 *         <Input
 *           defaultValue={text}
 *           onPressEnter={(e) => saveEdit(record.id, 'name', e.currentTarget.value)}
 *           onBlur={(e) => saveEdit(record.id, 'name', e.currentTarget.value)}
 *           autoFocus
 *         />
 *       );
 *     }
 *     return (
 *       <span onClick={() => startEdit(record.id, 'name')}>
 *         {text}
 *       </span>
 *     );
 *   }
 * }
 * ```
 */
export function useInlineEdit<T = any>(options: UseInlineEditOptions<T>) {
  const { onSave, onError } = options;
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editingField, setEditingField] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  /**
   * 开始编辑
   * @param key - 记录的唯一标识
   * @param field - 要编辑的字段名
   */
  const startEdit = (key: string, field: string) => {
    setEditingKey(key);
    setEditingField(field);
  };

  /**
   * 保存编辑
   * @param key - 记录的唯一标识
   * @param field - 编辑的字段名
   * @param value - 新值
   */
  const saveEdit = async (key: string, field: string, value: any) => {
    if (saving) return;

    setSaving(true);
    try {
      await onSave(key, field, value);
      setEditingKey(null);
      setEditingField(null);
      message.success("保存成功");
    } catch (error) {
      message.error("保存失败");
      if (onError) {
        onError(error);
      }
    } finally {
      setSaving(false);
    }
  };

  /**
   * 取消编辑
   */
  const cancelEdit = () => {
    setEditingKey(null);
    setEditingField(null);
  };

  /**
   * 判断是否正在编辑指定的单元格
   * @param key - 记录的唯一标识
   * @param field - 字段名
   */
  const isEditing = (key: string, field: string) => {
    return editingKey === key && editingField === field;
  };

  return {
    editingKey,
    editingField,
    saving,
    startEdit,
    saveEdit,
    cancelEdit,
    isEditing,
  };
}
