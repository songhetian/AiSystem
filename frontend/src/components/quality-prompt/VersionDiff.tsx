import React from 'react';
import { Card, Row, Col, Typography, Tag, Space, Divider, Empty } from 'antd';
import {
  ArrowRightOutlined,
  PlusOutlined,
  MinusOutlined,
  EditOutlined,
} from '@ant-design/icons';
import { VersionRecord } from '@/api/quality-prompt';
import { formatDate } from '@/utils/date';

const { Text, Paragraph, Title } = Typography;

/**
 * VersionDiff组件Props
 */
export interface VersionDiffProps {
  /** 旧版本 */
  oldVersion: VersionRecord;
  /** 新版本 */
  newVersion: VersionRecord;
  /** 自定义样式 */
  style?: React.CSSProperties;
}

/**
 * 字段变更类型
 */
type ChangeType = 'added' | 'removed' | 'modified' | 'unchanged';

/**
 * 字段变更信息
 */
interface FieldChange {
  field: string;
  label: string;
  oldValue: string;
  newValue: string;
  changeType: ChangeType;
}

/**
 * 版本对比组件
 *
 * 用于并排显示两个版本的内容差异，支持：
 * - 并排显示两个版本的内容
 * - 高亮显示差异部分
 * - 字段级别的对比（name, content, applicable_scenarios等）
 * - 使用颜色标记新增、删除、修改
 *
 * @example
 * ```tsx
 * <VersionDiff
 *   oldVersion={version1}
 *   newVersion={version2}
 * />
 * ```
 */
export const VersionDiff: React.FC<VersionDiffProps> = ({
  oldVersion,
  newVersion,
  style,
}) => {
  /**
   * 计算字段变更
   */
  const calculateFieldChanges = (): FieldChange[] => {
    const fields: Array<{ field: keyof VersionRecord; label: string }> = [
      { field: 'content', label: 'Prompt内容' },
      { field: 'applicable_scenarios', label: '适用场景' },
    ];

    return fields.map(({ field, label }) => {
      const oldValue = String(oldVersion[field] || '');
      const newValue = String(newVersion[field] || '');

      let changeType: ChangeType = 'unchanged';
      if (!oldValue && newValue) {
        changeType = 'added';
      } else if (oldValue && !newValue) {
        changeType = 'removed';
      } else if (oldValue !== newValue) {
        changeType = 'modified';
      }

      return {
        field: String(field),
        label,
        oldValue,
        newValue,
        changeType,
      };
    });
  };

  const fieldChanges = calculateFieldChanges();

  /**
   * 获取变更类型的图标
   */
  const getChangeIcon = (changeType: ChangeType) => {
    switch (changeType) {
      case 'added':
        return <PlusOutlined style={{ color: '#52c41a' }} />;
      case 'removed':
        return <MinusOutlined style={{ color: '#ff4d4f' }} />;
      case 'modified':
        return <EditOutlined style={{ color: '#faad14' }} />;
      default:
        return null;
    }
  };

  /**
   * 获取变更类型的标签
   */
  const getChangeTag = (changeType: ChangeType) => {
    switch (changeType) {
      case 'added':
        return <Tag color="success">新增</Tag>;
      case 'removed':
        return <Tag color="error">删除</Tag>;
      case 'modified':
        return <Tag color="warning">修改</Tag>;
      case 'unchanged':
        return <Tag color="default">未变更</Tag>;
      default:
        return null;
    }
  };

  /**
   * 获取变更类型的背景色
   */
  const getChangeBackground = (changeType: ChangeType) => {
    switch (changeType) {
      case 'added':
        return '#f6ffed';
      case 'removed':
        return '#fff2f0';
      case 'modified':
        return '#fffbe6';
      default:
        return '#fafafa';
    }
  };

  /**
   * 获取变更类型的边框色
   */
  const getChangeBorderColor = (changeType: ChangeType) => {
    switch (changeType) {
      case 'added':
        return '#52c41a';
      case 'removed':
        return '#ff4d4f';
      case 'modified':
        return '#faad14';
      default:
        return '#d9d9d9';
    }
  };

  /**
   * 渲染版本头部
   */
  const renderVersionHeader = (version: VersionRecord, title: string) => (
    <Space direction="vertical" size="small" style={{ width: '100%' }}>
      <Space>
        <Text strong style={{ fontSize: 16 }}>
          {title}
        </Text>
        <Tag color="blue">v{version.version}</Tag>
      </Space>
      <Text type="secondary" style={{ fontSize: 12 }}>
        修改人: {version.modified_by_name || version.modified_by}
      </Text>
      <Text type="secondary" style={{ fontSize: 12 }}>
        修改时间: {formatDate(version.modified_at, 'YYYY-MM-DD HH:mm:ss')}
      </Text>
      {version.change_description && (
        <Paragraph
          style={{
            marginTop: 4,
            marginBottom: 0,
            padding: '6px 10px',
            background: '#f0f0f0',
            borderRadius: 4,
            fontSize: 12,
          }}
        >
          {version.change_description}
        </Paragraph>
      )}
    </Space>
  );

  /**
   * 渲染字段内容
   */
  const renderFieldContent = (value: string, changeType: ChangeType) => {
    if (!value) {
      return (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="无内容"
          style={{ margin: '20px 0' }}
        />
      );
    }

    return (
      <Paragraph
        style={{
          marginBottom: 0,
          padding: '12px',
          background: getChangeBackground(changeType),
          borderLeft: `3px solid ${getChangeBorderColor(changeType)}`,
          borderRadius: 4,
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          minHeight: 100,
        }}
      >
        {value}
      </Paragraph>
    );
  };

  /**
   * 渲染字段对比
   */
  const renderFieldComparison = (fieldChange: FieldChange) => (
    <div key={fieldChange.field} style={{ marginBottom: 24 }}>
      {/* 字段标题 */}
      <Space style={{ marginBottom: 12 }}>
        {getChangeIcon(fieldChange.changeType)}
        <Text strong style={{ fontSize: 14 }}>
          {fieldChange.label}
        </Text>
        {getChangeTag(fieldChange.changeType)}
      </Space>

      {/* 字段内容对比 */}
      <Row gutter={16}>
        {/* 旧版本内容 */}
        <Col span={12}>
          <Card
            size="small"
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                旧版本 (v{oldVersion.version})
              </Text>
            }
            style={{ height: '100%' }}
          >
            {renderFieldContent(fieldChange.oldValue, fieldChange.changeType)}
          </Card>
        </Col>

        {/* 新版本内容 */}
        <Col span={12}>
          <Card
            size="small"
            title={
              <Text type="secondary" style={{ fontSize: 12 }}>
                新版本 (v{newVersion.version})
              </Text>
            }
            style={{ height: '100%' }}
          >
            {renderFieldContent(fieldChange.newValue, fieldChange.changeType)}
          </Card>
        </Col>
      </Row>
    </div>
  );

  /**
   * 计算变更统计
   */
  const changeStats = {
    added: fieldChanges.filter((f) => f.changeType === 'added').length,
    removed: fieldChanges.filter((f) => f.changeType === 'removed').length,
    modified: fieldChanges.filter((f) => f.changeType === 'modified').length,
    unchanged: fieldChanges.filter((f) => f.changeType === 'unchanged').length,
  };

  return (
    <Card
      title={
        <Space>
          <Text strong style={{ fontSize: 16 }}>
            版本对比
          </Text>
          <Tag color="blue">v{oldVersion.version}</Tag>
          <ArrowRightOutlined />
          <Tag color="green">v{newVersion.version}</Tag>
        </Space>
      }
      extra={
        <Space size="large">
          {changeStats.added > 0 && (
            <Space size="small">
              <PlusOutlined style={{ color: '#52c41a' }} />
              <Text type="secondary">{changeStats.added} 新增</Text>
            </Space>
          )}
          {changeStats.removed > 0 && (
            <Space size="small">
              <MinusOutlined style={{ color: '#ff4d4f' }} />
              <Text type="secondary">{changeStats.removed} 删除</Text>
            </Space>
          )}
          {changeStats.modified > 0 && (
            <Space size="small">
              <EditOutlined style={{ color: '#faad14' }} />
              <Text type="secondary">{changeStats.modified} 修改</Text>
            </Space>
          )}
        </Space>
      }
      style={style}
    >
      {/* 版本头部对比 */}
      <Row gutter={16} style={{ marginBottom: 24 }}>
        <Col span={12}>
          <Card size="small" style={{ background: '#f5f5f5' }}>
            {renderVersionHeader(oldVersion, '旧版本')}
          </Card>
        </Col>
        <Col span={12}>
          <Card size="small" style={{ background: '#f5f5f5' }}>
            {renderVersionHeader(newVersion, '新版本')}
          </Card>
        </Col>
      </Row>

      <Divider />

      {/* 字段对比 */}
      {fieldChanges.map((fieldChange) => renderFieldComparison(fieldChange))}

      {/* 底部提示 */}
      {changeStats.unchanged === fieldChanges.length && (
        <Empty
          image={Empty.PRESENTED_IMAGE_SIMPLE}
          description="两个版本的内容完全相同"
          style={{ marginTop: 24 }}
        />
      )}
    </Card>
  );
};

export default VersionDiff;
