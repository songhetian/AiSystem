import { useState, useCallback } from "react";
import { Form, message } from "antd";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  permissionTemplateApi,
  PermissionTemplate,
} from "@/api/permission-template";

/**
 * 模板弹窗管理Hook
 */
export function useTemplateModal() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const [modalOpen, setModalOpen] = useState(false);
  const [editingTemplate, setEditingTemplate] =
    useState<PermissionTemplate | null>(null);
  const [checkedMenuKeys, setCheckedMenuKeys] = useState<string[]>([]);
  const [checkedButtonKeys, setCheckedButtonKeys] = useState<string[]>([]);

  // 创建模板
  const createMutation = useMutation({
    mutationFn: permissionTemplateApi.createTemplate,
    onSuccess: () => {
      message.success("创建成功");
      handleClose();
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
    },
    onError: (error: any) => {
      message.error(error?.message || "创建失败");
    },
  });

  // 更新模板
  const updateMutation = useMutation({
    mutationFn: permissionTemplateApi.updateTemplate,
    onSuccess: () => {
      message.success("更新成功");
      handleClose();
      queryClient.invalidateQueries({ queryKey: ["permission-templates"] });
    },
    onError: (error: any) => {
      message.error(error?.message || "更新失败");
    },
  });

  // 打开创建弹窗
  const handleCreate = useCallback(() => {
    setEditingTemplate(null);
    form.resetFields();
    setCheckedMenuKeys([]);
    setCheckedButtonKeys([]);
    setModalOpen(true);
  }, [form]);

  // 打开编辑弹窗
  const handleEdit = useCallback(
    (record: PermissionTemplate) => {
      setEditingTemplate(record);
      form.setFieldsValue({
        templateName: record.template_name,
        templateType: record.template_type,
        description: record.description,
        category: record.category,
      });
      setCheckedMenuKeys(record.permission_config.menuIds || []);
      setCheckedButtonKeys(record.permission_config.buttonIds || []);
      setModalOpen(true);
    },
    [form],
  );

  // 关闭弹窗
  const handleClose = useCallback(() => {
    setModalOpen(false);
    setEditingTemplate(null);
    form.resetFields();
    setCheckedMenuKeys([]);
    setCheckedButtonKeys([]);
  }, [form]);

  // 提交表单
  const handleSubmit = useCallback(
    async (values: any) => {
      const data = {
        ...values,
        permissionConfig: {
          type: "custom",
          menuIds: checkedMenuKeys,
          buttonIds: checkedButtonKeys,
        },
      };

      if (editingTemplate) {
        updateMutation.mutate({ id: editingTemplate.id, ...data });
      } else {
        createMutation.mutate(data);
      }
    },
    [
      checkedMenuKeys,
      checkedButtonKeys,
      editingTemplate,
      createMutation,
      updateMutation,
    ],
  );

  return {
    form,
    modalOpen,
    editingTemplate,
    checkedMenuKeys,
    checkedButtonKeys,
    setCheckedMenuKeys,
    setCheckedButtonKeys,
    handleCreate,
    handleEdit,
    handleClose,
    handleSubmit,
    isLoading: createMutation.isPending || updateMutation.isPending,
  };
}
