/**
 * 空状态组件
 * Task 17.3: 实现用户友好提示 - 空状态提示
 * Requirements: 14.2, 14.3, 14.4, 18.1
 *
 * 显示无数据、无搜索结果等空状态
 */

import React from 'react';
import { Empty, Button, Space } from 'antd';
import {
  FileTextOutlined,
  SearchOutlined,
  InboxOutlined,
  FolderOpenOutlined,
} from '@ant-design/icons';

export type EmptyStateType = 'no-data' | 'no-search-result' | 'no-permission' | 'error';

export interface EmptyStateProps {
  type?: EmptyStateType;
  title?: string;
  description?: string;
  action?: {
    text: string;
    onClick: () => void;
  };
  style?: React.CSSProperties;
}

/**
 * 空状态组件
 */
export const EmptyState: React.FC<EmptyStateProps> = ({
  type = 'no-data',
  title,
  description,
  action,
  style,
}) => {
  // 获取默认配置
  const getDefaultConfig = () => {
    switch (type) {
      case 'no-data':
        return {
          icon: <InboxOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />,
          title: title || '暂无数据',
          description: description || '当前没有任何日志记录',
        };
      case 'no-search-result':
        return {
          icon: <SearchOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />,
          title: title || '无匹配结果',
          description: description || '未找到符合搜索条件的日志，请尝试调整搜索条件',
        };
      case 'no-permission':
        return {
          icon: <FolderOpenOutlined style={{ fontSize: 64, color: '#faad14' }} />,
          title: title || '无权限访问',
          description: description || '您没有权限查看此内容，请联系管理员',
        };
      case 'error':
        return {
          icon: <FileTextOutlined style={{ fontSize: 64, color: '#ff4d4f' }} />,
          title: title || '加载失败',
          description: description || '数据加载失败，请稍后重试',
        };
      default:
        return {
          icon: <InboxOutlined style={{ fontSize: 64, color: '#d9d9d9' }} />,
          title: title || '暂无数据',
          description: description || '',
        };
    }
  };

  const config = getDefaultConfig();

  return (
    <div
      style={{
        padding: '48px 24px',
        textAlign: 'center',
        background: '#fafafa',
        borderRadius: '8px',
        ...style,
      }}
    >
      <Empty
        image={config.icon}
        imageStyle={{
          height: 80,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
        description={
          <Space direction="vertical" size="small">
            <div style={{ fontSize: 16, fontWeight: 500, color: '#262626' }}>
              {config.title}
            </div>
            {config.description && (
              <div style={{ fontSize: 14, color: '#8c8c8c' }}>
                {config.description}
              </div>
            )}
          </Space>
        }
      >
        {action && (
          <Button type="primary" onClick={action.onClick}>
            {action.text}
          </Button>
        )}
      </Empty>
    </div>
  );
};

/**
 * 日志列表空状态
 */
export const LogListEmptyState: React.FC<{
  hasFilters: boolean;
  onReset?: () => void;
}> = ({ hasFilters, onReset }) => {
  if (hasFilters) {
    return (
      <EmptyState
        type="no-search-result"
        title="无匹配日志"
        description="未找到符合搜索条件的日志记录，请尝试调整搜索条件"
        action={
          onReset
            ? {
                text: '重置搜索条件',
                onClick: onReset,
              }
            : undefined
        }
      />
    );
  }

  return (
    <EmptyState
      type="no-data"
      title="暂无日志"
      description="当前时间范围内没有日志记录"
    />
  );
};

/**
 * 日志导出空状态
 */
export const LogExportEmptyState: React.FC = () => {
  return (
    <EmptyState
      type="no-search-result"
      title="无法导出"
      description="没有可导出的日志数据，请先进行搜索"
    />
  );
};

export default EmptyState;
