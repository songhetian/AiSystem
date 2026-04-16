import { useCallback } from 'react';
import { Modal, message } from 'antd';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { permissionTemplateApi, PermissionTemplate } from '@/api/permission-template';
import { downloadJSON, parseJSONFile } from '@/utils/fileDownload';

/**
 * 模板操作Hook（删除、复制、导出、导入）
 */
export function useTemplateOperations() {
  const queryClient = useQueryClient();

  // 删除模板
  const deleteMutation = useMutation({
    mutationFn: permissionTemplateApi.deleteTemplate,
    onSuccess: () => {
      message.success('删除成功');
      queryClient.invalidateQueries({ queryKey: ['permission-templates'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '删除失败');
    },
  });

  // 复制模板
  const copyMutation = useMutation({
    mutationFn: ({ id, newName }: { id: string; newName: string }) =>
      permissionTemplateApi.copyTemplate(id, newName),
    onSuccess: () => {
      message.success('复制成功');
      queryClient.invalidateQueries({ queryKey: ['permission-templates'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '复制失败');
    },
  });

  // 导出模板
  const exportMutation = useMutation({
    mutationFn: permissionTemplateApi.exportTemplates,
    onSuccess: (data) => {
      downloadJSON(data, `permission-templates-${Date.now()}`);
      message.success('导出成功');
    },
    onError: (error: any) => {
      message.error(error?.message || '导出失败');
    },
  });

  // 导入模板
  const importMutation = useMutation({
    mutationFn: permissionTemplateApi.importTemplates,
    onSuccess: (data: any) => {
      const successCount = data.results.filter((r: any) => r.status !== 'failed').length;
      const failedCount = data.results.filter((r: any) => r.status === 'failed').length;

      if (failedCount > 0) {
        message.warning(`导入完成：成功 ${successCount} 个，失败 ${failedCount} 个`);
      } else {
        message.success(`导入成功：${successCount} 个模板`);
      }

      queryClient.invalidateQueries({ queryKey: ['permission-templates'] });
    },
    onError: (error: any) => {
      message.error(error?.message || '导入失败');
    },
  });

  // 删除处理
  const handleDelete = useCallback((id: string) => {
    deleteMutation.mutate(id);
  }, [deleteMutation]);

  // 复制处理
  const handleCopy = useCallback((record: PermissionTemplate) => {
    let newName = '';

    Modal.confirm({
      title: '复制模板',
      content: (
        <div style={{ marginTop: 16 }}>
          <label>新模板名称：</label>
          <input
            type="text"
            id="newTemplateName"
            className="ant-input"
            placeholder="请输入新模板名称"
            defaultValue={`${record.template_name} - 副本`}
            style={{ width: '100%', marginTop: 8 }}
            onChange={(e) => (newName = e.target.value)}
          />
        </div>
      ),
      onOk: () => {
        const finalName = newName || `${record.template_name} - 副本`;
        copyMutation.mutate({ id: record.id, newName: finalName });
      },
    });
  }, [copyMutation]);

  // 导出处理
  const handleExport = useCallback((templateIds: string[], encrypted: boolean = false) => {
    if (templateIds.length === 0) {
      message.warning('请选择要导出的模板');
      return;
    }

    exportMutation.mutate({
      templateIds,
      encrypted: encrypted ? 1 : 0,
    });
  }, [exportMutation]);

  // 导入处理
  const handleImport = useCallback(async (file: File, overwrite: boolean = false) => {
    try {
      const data = await parseJSONFile(file);
      importMutation.mutate({
        templates: data.data || data,
        overwrite: overwrite ? 1 : 0,
      });
    } catch (error: any) {
      message.error(error?.message || '文件格式错误');
    }
    return false; // 阻止默认上传行为
  }, [importMutation]);

  return {
    handleDelete,
    handleCopy,
    handleExport,
    handleImport,
    isDeleting: deleteMutation.isPending,
    isCopying: copyMutation.isPending,
    isExporting: exportMutation.isPending,
    isImporting: importMutation.isPending,
  };
}
