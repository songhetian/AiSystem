import React, { useState } from 'react';
import { Space, Button, Upload, message, Modal } from 'antd';
import {
  CheckOutlined,
  CloseOutlined,
  DeleteOutlined,
  UploadOutlined,
  DownloadOutlined,
  ExclamationCircleOutlined,
} from '@ant-design/icons';
import type { UploadFile } from 'antd/es/upload/interface';
import { qualityPromptApi } from '@/api/quality-prompt';
import { downloadFile } from '@/utils/fileDownload';

interface BatchOperationBarProps {
  /**
   * 已选择的记录ID列表
   */
  selectedRowKeys: string[];
  /**
   * Prompt类型: global 或 department
   */
  promptType: 'global' | 'department';
  /**
   * 取消选择回调
   */
  onCancelSelection: () => void;
  /**
   * 批量启用回调
   */
  onBatchEnable?: () => void;
  /**
   * 批量禁用回调
   */
  onBatchDisable?: () => void;
  /**
   * 批量删除回调
   */
  onBatchDelete?: () => void;
  /**
   * 导入成功回调
   */
  onImportSuccess?: () => void;
  /**
   * 是否显示删除按钮
   */
  showDelete?: boolean;
  /**
   * 是否显示导入/导出按钮
   */
  showImportExport?: boolean;
}

/**
 * 批量操作工具栏组件
 * 提供批量启用、禁用、删除、导入、导出功能
 *
 * 功能:
 * - 显示已选择的记录数量
 * - 批量启用/禁用
 * - 批量删除（需确认）
 * - 导入Excel文件
 * - 导出Excel文件
 *
 * 需求: 9.1, 9.2, 9.3, 9.4, 9.5, 9.6, 9.7
 */
export const BatchOperationBar: React.FC<BatchOperationBarProps> = ({
  selectedRowKeys,
  promptType,
  onCancelSelection,
  onBatchEnable,
  onBatchDisable,
  onBatchDelete,
  onImportSuccess,
  showDelete = true,
  showImportExport = true,
}) => {
  const [importing, setImporting] = useState(false);
  const [exporting, setExporting] = useState(false);

  // 处理批量启用
  const handleBatchEnable = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要启用的记录');
      return;
    }
    Modal.confirm({
      title: '批量启用',
      icon: <ExclamationCircleOutlined />,
      content: `确定要启用选中的 ${selectedRowKeys.length} 条记录吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        onBatchEnable?.();
      },
    });
  };

  // 处理批量禁用
  const handleBatchDisable = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要禁用的记录');
      return;
    }
    Modal.confirm({
      title: '批量禁用',
      icon: <ExclamationCircleOutlined />,
      content: `确定要禁用选中的 ${selectedRowKeys.length} 条记录吗？`,
      okText: '确认',
      cancelText: '取消',
      onOk: () => {
        onBatchDisable?.();
      },
    });
  };

  // 处理批量删除
  const handleBatchDelete = () => {
    if (selectedRowKeys.length === 0) {
      message.warning('请先选择要删除的记录');
      return;
    }
    Modal.confirm({
      title: '批量删除',
      icon: <ExclamationCircleOutlined />,
      content: (
        <div>
          <p>确定要删除选中的 {selectedRowKeys.length} 条记录吗？</p>
          <p style={{ color: '#ff4d4f', fontSize: 12 }}>
            警告：此操作不可恢复，请谨慎操作！
          </p>
        </div>
      ),
      okText: '确认删除',
      cancelText: '取消',
      okButtonProps: { danger: true },
      onOk: () => {
        onBatchDelete?.();
      },
    });
  };

  // 处理导入
  const handleImport = async (file: UploadFile) => {
    setImporting(true);
    try {
      const formData = new FormData();
      formData.append('file', file as any);

      let result;
      if (promptType === 'global') {
        result = await qualityPromptApi.importGlobalPrompts(file as any);
      } else {
        result = await qualityPromptApi.importDepartmentPrompts(file as any);
      }

      if (result.success > 0) {
        message.success(`导入成功 ${result.success} 条记录`);
        onImportSuccess?.();
      }

      if (result.failure > 0) {
        Modal.warning({
          title: '导入完成，但有部分失败',
          content: (
            <div>
              <p>成功: {result.success} 条</p>
              <p>失败: {result.failure} 条</p>
              {result.errors && result.errors.length > 0 && (
                <div style={{ marginTop: 8 }}>
                  <p style={{ fontWeight: 'bold' }}>错误详情:</p>
                  <ul style={{ maxHeight: 200, overflowY: 'auto' }}>
                    {result.errors.map((error, index) => (
                      <li key={index} style={{ color: '#ff4d4f', fontSize: 12 }}>
                        {error}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ),
          width: 600,
        });
      }
    } catch (error: any) {
      message.error(error?.message || '导入失败');
    } finally {
      setImporting(false);
    }
    return false; // 阻止自动上传
  };

  // 处理导出
  const handleExport = async () => {
    setExporting(true);
    try {
      let blob;
      if (promptType === 'global') {
        blob = await qualityPromptApi.exportGlobalPrompts();
      } else {
        blob = await qualityPromptApi.exportDepartmentPrompts();
      }

      const filename = `${promptType === 'global' ? '全局' : '部门'}Prompt_${new Date().toISOString().slice(0, 10)}.xlsx`;
      downloadFile(blob, filename);
      message.success('导出成功');
    } catch (error: any) {
      message.error(error?.message || '导出失败');
    } finally {
      setExporting(false);
    }
  };

  return (
    <div
      style={{
        marginBottom: 16,
        padding: '8px 16px',
        background: '#e6f7ff',
        borderRadius: 4,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}
    >
      <Space>
        <span style={{ fontWeight: 'bold' }}>
          已选择 {selectedRowKeys.length} 项
        </span>
        {onBatchEnable && (
          <Button
            size="small"
            icon={<CheckOutlined />}
            onClick={handleBatchEnable}
          >
            批量启用
          </Button>
        )}
        {onBatchDisable && (
          <Button
            size="small"
            icon={<CloseOutlined />}
            onClick={handleBatchDisable}
          >
            批量禁用
          </Button>
        )}
        {showDelete && onBatchDelete && (
          <Button
            size="small"
            danger
            icon={<DeleteOutlined />}
            onClick={handleBatchDelete}
          >
            批量删除
          </Button>
        )}
        <Button size="small" onClick={onCancelSelection}>
          取消选择
        </Button>
      </Space>

      {showImportExport && (
        <Space>
          <Upload
            accept=".xlsx,.xls"
            showUploadList={false}
            beforeUpload={handleImport}
          >
            <Button
              size="small"
              icon={<UploadOutlined />}
              loading={importing}
            >
              导入Excel
            </Button>
          </Upload>
          <Button
            size="small"
            icon={<DownloadOutlined />}
            onClick={handleExport}
            loading={exporting}
          >
            导出Excel
          </Button>
        </Space>
      )}
    </div>
  );
};
