import React, { useState } from 'react';
import { Button, message } from 'antd';
import { DownloadOutlined } from '@ant-design/icons';
import { download } from '@/utils/request';

export interface ExportButtonProps {
  exportType: 'operation' | 'login';
  filters: any;
  disabled?: boolean;
}

/**
 * 导出按钮组件（可复用）
 * 支持操作日志和登录日志导出
 */
export const ExportButton: React.FC<ExportButtonProps> = ({
  exportType,
  filters,
  disabled,
}) => {
  const [loading, setLoading] = useState(false);

  const handleExport = async () => {
    try {
      setLoading(true);

      const url = exportType === 'operation'
        ? '/system/logs/operation/export'
        : '/system/logs/login/export';

      const filename = exportType === 'operation'
        ? `操作日志_${new Date().getTime()}.xlsx`
        : `登录日志_${new Date().getTime()}.xlsx`;

      await download(url, filename, filters);

      message.success('导出成功');
    } catch (error: any) {
      console.error('导出失败:', error);
      message.error(error.message || '导出失败，请稍后重试');
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button
      type="primary"
      icon={<DownloadOutlined />}
      onClick={handleExport}
      loading={loading}
      disabled={disabled}
    >
      导出Excel
    </Button>
  );
};
