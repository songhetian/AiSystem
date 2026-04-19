import React from 'react';
import { Alert, List, Typography, Space, Tag, Divider } from 'antd';
import { ExclamationCircleOutlined, BulbOutlined, CloseCircleOutlined } from '@ant-design/icons';

const { Text, Paragraph } = Typography;

/**
 * 冲突信息接口
 */
export interface ConflictInfo {
  /** 冲突的Prompt名称 */
  promptName: string;
  /** 冲突类型（语义冲突、关键词冲突等） */
  conflictType: string;
  /** 冲突的具体内容 */
  conflictContent: string;
  /** 建议解决方案 */
  suggestion: string;
}

/**
 * ConflictAlert组件Props
 */
export interface ConflictAlertProps {
  /** 冲突信息列表 */
  conflicts: ConflictInfo[];
  /** 关闭回调 */
  onClose?: () => void;
  /** 自定义样式 */
  style?: React.CSSProperties;
  /** 是否显示关闭按钮 */
  closable?: boolean;
  /** 是否显示图标 */
  showIcon?: boolean;
}

/**
 * 冲突类型标签颜色映射
 */
const conflictTypeColorMap: Record<string, string> = {
  '语义冲突': 'red',
  '关键词冲突': 'orange',
  '逻辑冲突': 'volcano',
  '规则冲突': 'magenta',
  '默认': 'error',
};

/**
 * 获取冲突类型对应的标签颜色
 */
const getConflictTypeColor = (conflictType: string): string => {
  return conflictTypeColorMap[conflictType] || conflictTypeColorMap['默认'];
};

/**
 * 冲突校验警告组件
 *
 * 用于显示部门Prompt与全局Prompt之间的冲突详情，包括：
 * - 冲突位置（关联的全局Prompt名称）
 * - 冲突类型（语义冲突、关键词冲突等）
 * - 冲突内容（具体的冲突描述）
 * - 建议解决方案
 *
 * 该组件会阻止用户保存，直到所有冲突都被解决。
 *
 * @example
 * ```tsx
 * <ConflictAlert
 *   conflicts={[
 *     {
 *       promptName: '礼貌用语规范',
 *       conflictType: '语义冲突',
 *       conflictContent: '部门Prompt要求"可以使用口语化表达"，但全局Prompt要求"必须使用标准书面语"',
 *       suggestion: '建议修改部门Prompt，移除口语化表达的要求，或联系管理员调整全局Prompt'
 *     }
 *   ]}
 *   onClose={() => console.log('关闭冲突提示')}
 * />
 * ```
 */
export const ConflictAlert: React.FC<ConflictAlertProps> = ({
  conflicts,
  onClose,
  style,
  closable = true,
  showIcon = true,
}) => {
  // 如果没有冲突，不显示组件
  if (!conflicts || conflicts.length === 0) {
    return null;
  }

  return (
    <Alert
      message={
        <Space>
          <ExclamationCircleOutlined style={{ fontSize: 16, color: '#ff4d4f' }} />
          <Text strong style={{ fontSize: 16 }}>
            检测到 {conflicts.length} 个与全局Prompt的冲突
          </Text>
        </Space>
      }
      description={
        <div style={{ marginTop: 12 }}>
          <Paragraph type="danger" style={{ marginBottom: 16 }}>
            <CloseCircleOutlined style={{ marginRight: 4 }} />
            请解决以下冲突后再保存部门Prompt，以确保质检标准的一致性。
          </Paragraph>

          <List
            dataSource={conflicts}
            renderItem={(conflict, index) => (
              <List.Item
                key={index}
                style={{
                  display: 'block',
                  padding: '12px 0',
                  borderBottom: index < conflicts.length - 1 ? '1px solid #f0f0f0' : 'none',
                }}
              >
                <Space direction="vertical" size="small" style={{ width: '100%' }}>
                  {/* 冲突标题：Prompt名称 + 冲突类型 */}
                  <Space>
                    <Text strong style={{ fontSize: 14 }}>
                      冲突 {index + 1}:
                    </Text>
                    <Text style={{ fontSize: 14 }}>
                      与全局Prompt "{conflict.promptName}" 存在冲突
                    </Text>
                    <Tag color={getConflictTypeColor(conflict.conflictType)}>
                      {conflict.conflictType}
                    </Tag>
                  </Space>

                  {/* 冲突内容 */}
                  <div style={{ paddingLeft: 16 }}>
                    <Text type="secondary" style={{ fontSize: 12 }}>
                      冲突内容:
                    </Text>
                    <Paragraph
                      style={{
                        marginTop: 4,
                        marginBottom: 8,
                        padding: '8px 12px',
                        background: '#fff2e8',
                        borderLeft: '3px solid #ff7a45',
                        borderRadius: 4,
                      }}
                    >
                      {conflict.conflictContent}
                    </Paragraph>
                  </div>

                  {/* 建议解决方案 */}
                  <div style={{ paddingLeft: 16 }}>
                    <Space>
                      <BulbOutlined style={{ color: '#faad14' }} />
                      <Text type="secondary" style={{ fontSize: 12 }}>
                        建议解决方案:
                      </Text>
                    </Space>
                    <Paragraph
                      style={{
                        marginTop: 4,
                        marginBottom: 0,
                        padding: '8px 12px',
                        background: '#fffbe6',
                        borderLeft: '3px solid #faad14',
                        borderRadius: 4,
                      }}
                    >
                      {conflict.suggestion}
                    </Paragraph>
                  </div>
                </Space>
              </List.Item>
            )}
          />

          <Divider style={{ margin: '16px 0' }} />

          {/* 底部提示 */}
          <Paragraph type="secondary" style={{ marginBottom: 0, fontSize: 12 }}>
            <Text type="secondary">💡 提示: </Text>
            如果您认为全局Prompt的要求不合理，请联系超级管理员进行调整。
            部门Prompt应当在全局Prompt的基础上进行补充和细化，而不是与之冲突。
          </Paragraph>
        </div>
      }
      type="error"
      showIcon={showIcon}
      closable={closable}
      onClose={onClose}
      style={{
        marginBottom: 16,
        ...style,
      }}
    />
  );
};

export default ConflictAlert;
