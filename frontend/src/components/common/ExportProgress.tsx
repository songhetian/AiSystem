/**
 * 导出进度条组件
 * Task 17.2: 实现加载状态提示 - 导出进度条
 * Requirements: 17.1, 18.1
 *
 * 显示日志导出的进度和状态
 */

import React, { useState, useEffect } from 'react';
import { Modal, Progress, Space, Typography } from 'antd';
import { LoadingOutlined, CheckCircleOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text } = Typography;

export interface ExportProgressProps {
  visible: boolean;
  status: 'preparing' | 'exporting' | 'success' | 'error';
  progress?: number;  // 0-100
  message?: string;
  onClose?: () => void;
}

/**
 * 导出进度条组件
 */
export const ExportProgress: React.FC<ExportProgressProps> = ({
  visible,
  status,
  progress = 0,
  message,
  onClose,
}) => {
  const [displayProgress, setDisplayProgress] = useState(0);

  // 模拟进度增长（当没有真实进度时）
  useEffect(() => {
    if (status === 'preparing' || status === 'exporting') {
      const interval = setInterval(() => {
        setDisplayProgress((prev) => {
          if (progress > 0) {
            return progress;
          }
          // 模拟进度：准备阶段到30%，导出阶段到90%
          const target = status === 'preparing' ? 30 : 90;
          if (prev < target) {
            return Math.min(prev + 5, target);
          }
          return prev;
        });
      }, 200);

      return () => clearInterval(interval);
    } else if (status === 'success') {
      setDisplayProgress(100);
    }
  }, [status, progress]);

  // 重置进度
  useEffect(() => {
    if (!visible) {
      setDisplayProgress(0);
    }
  }, [visible]);

  // 获取状态图标
  const getStatusIcon = () => {
    switch (status) {
      case 'preparing':
      case 'exporting':
        return <LoadingOutlined style={{ fontSize: 24, color: '#1890ff' }} spin />;
      case 'success':
        return <CheckCircleOutlined style={{ fontSize: 24, color: '#52c41a' }} />;
      case 'error':
        return <CloseCircleOutlined style={{ fontSize: 24, color: '#ff4d4f' }} />;
      default:
        return null;
    }
  };

  // 获取状态文本
  const getStatusText = () => {
    if (message) {
      return message;
    }

    switch (status) {
      case 'preparing':
        return '正在准备导出数据...';
      case 'exporting':
        return '正在导出，请稍候...';
      case 'success':
        return '导出成功！';
      case 'error':
        return '导出失败，请重试';
      default:
        return '';
    }
  };

  // 获取进度条状态
  const getProgressStatus = (): 'success' | 'exception' | 'active' | 'normal' => {
    switch (status) {
      case 'success':
        return 'success';
      case 'error':
        return 'exception';
      case 'preparing':
      case 'exporting':
        return 'active';
      default:
        return 'normal';
    }
  };

  return (
    <Modal
      open={visible}
      title="导出日志"
      footer={null}
      closable={status === 'success' || status === 'error'}
      maskClosable={false}
      onCancel={onClose}
      width={480}
      centered
    >
      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        {/* 状态图标和文本 */}
        <div style={{ textAlign: 'center' }}>
          <div style={{ marginBottom: '16px' }}>{getStatusIcon()}</div>
          <Text strong style={{ fontSize: 16 }}>
            {getStatusText()}
          </Text>
        </div>

        {/* 进度条 */}
        {(status === 'preparing' || status === 'exporting' || status === 'success') && (
          <Progress
            percent={displayProgress}
            status={getProgressStatus()}
            strokeColor={{
              '0%': '#108ee9',
              '100%': '#87d068',
            }}
          />
        )}

        {/* 提示信息 */}
        {status === 'exporting' && (
          <Text type="secondary" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
            导出大量数据可能需要较长时间，请耐心等待
          </Text>
        )}

        {status === 'success' && (
          <Text type="success" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
            文件已自动下载到您的下载文件夹
          </Text>
        )}

        {status === 'error' && message && (
          <Text type="danger" style={{ fontSize: 12, textAlign: 'center', display: 'block' }}>
            {message}
          </Text>
        )}
      </Space>
    </Modal>
  );
};

export default ExportProgress;
