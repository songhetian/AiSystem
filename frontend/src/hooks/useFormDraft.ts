import { useEffect } from "react";
import { FormInstance } from "antd";

/**
 * 表单草稿自动保存 Hook
 * @param form Ant Design 表单实例
 * @param key 草稿存储的唯一标识
 * @param interval 自动保存间隔（毫秒），默认 30 秒
 * @returns { clearDraft } 清除草稿的方法
 */
export function useFormDraft(
  form: FormInstance,
  key: string,
  interval: number = 30000,
) {
  useEffect(() => {
    // 加载草稿
    const draft = localStorage.getItem(`form-draft-${key}`);
    if (draft) {
      try {
        const parsedDraft = JSON.parse(draft);
        form.setFieldsValue(parsedDraft);
        console.log(`[FormDraft] 已加载草稿: ${key}`);
      } catch (e) {
        console.error("[FormDraft] 加载草稿失败", e);
      }
    }

    // 自动保存
    const timer = setInterval(() => {
      const values = form.getFieldsValue();
      // 只有当表单有值时才保存
      if (Object.keys(values).length > 0) {
        localStorage.setItem(`form-draft-${key}`, JSON.stringify(values));
        console.log(`[FormDraft] 已自动保存草稿: ${key}`);
      }
    }, interval);

    return () => {
      clearInterval(timer);
    };
  }, [form, key, interval]);

  const clearDraft = () => {
    localStorage.removeItem(`form-draft-${key}`);
    console.log(`[FormDraft] 已清除草稿: ${key}`);
  };

  return { clearDraft };
}
