/**
 * ConflictAlert 组件示例
 *
 * 本文件展示了ConflictAlert组件的各种使用场景
 */

import React, { useState } from 'react';
import { Card, Space, Button, Divider } from 'antd';
import { ConflictAlert } from './ConflictAlert';
import type { ConflictInfo } from './ConflictAlert';

/**
 * 示例1: 单个冲突
 */
export const SingleConflictExample: React.FC = () => {
  const conflicts: ConflictInfo[] = [
    {
      promptName: '礼貌用语规范',
      conflictType: '语义冲突',
      conflictContent: '部门Prompt要求"可以使用口语化表达"，但全局Prompt要求"必须使用标准书面语"',
      suggestion: '建议修改部门Prompt，移除口语化表达的要求，或联系管理员调整全局Prompt',
    },
  ];

  return (
    <Card title="示例1: 单个冲突">
      <ConflictAlert conflicts={conflicts} />
    </Card>
  );
};

/**
 * 示例2: 多个冲突
 */
export const MultipleConflictsExample: React.FC = () => {
  const conflicts: ConflictInfo[] = [
    {
      promptName: '礼貌用语规范',
      conflictType: '语义冲突',
      conflictContent: '部门Prompt要求"可以使用口语化表达"，但全局Prompt要求"必须使用标准书面语"',
      suggestion: '建议修改部门Prompt，移除口语化表达的要求，或联系管理员调整全局Prompt',
    },
    {
      promptName: '响应时效要求',
      conflictType: '关键词冲突',
      conflictContent: '部门Prompt要求"24小时内回复"，但全局Prompt要求"2小时内回复"',
      suggestion: '建议修改部门Prompt，将响应时效调整为不超过2小时',
    },
    {
      promptName: '服务流程规范',
      conflictType: '逻辑冲突',
      conflictContent: '部门Prompt允许"跳过身份验证步骤"，但全局Prompt要求"必须完成身份验证"',
      suggestion: '建议修改部门Prompt，确保所有流程都包含身份验证步骤',
    },
  ];

  return (
    <Card title="示例2: 多个冲突">
      <ConflictAlert conflicts={conflicts} />
    </Card>
  );
};

/**
 * 示例3: 不同冲突类型
 */
export const DifferentConflictTypesExample: React.FC = () => {
  const [currentType, setCurrentType] = useState<string>('语义冲突');

  const conflictsByType: Record<string, ConflictInfo[]> = {
    '语义冲突': [
      {
        promptName: '礼貌用语规范',
        conflictType: '语义冲突',
        conflictContent: '部门Prompt与全局Prompt在语义上存在矛盾',
        suggestion: '建议调整部门Prompt的表述，确保与全局Prompt语义一致',
      },
    ],
    '关键词冲突': [
      {
        promptName: '响应时效要求',
        conflictType: '关键词冲突',
        conflictContent: '部门Prompt与全局Prompt在关键词要求上存在冲突',
        suggestion: '建议修改部门Prompt中的关键词要求',
      },
    ],
    '逻辑冲突': [
      {
        promptName: '服务流程规范',
        conflictType: '逻辑冲突',
        conflictContent: '部门Prompt与全局Prompt在逻辑流程上存在冲突',
        suggestion: '建议重新设计部门Prompt的流程逻辑',
      },
    ],
    '规则冲突': [
      {
        promptName: '质检评分标准',
        conflictType: '规则冲突',
        conflictContent: '部门Prompt与全局Prompt在评分规则上存在冲突',
        suggestion: '建议统一评分规则，确保与全局标准一致',
      },
    ],
  };

  return (
    <Card title="示例3: 不同冲突类型">
      <Space style={{ marginBottom: 16 }}>
        {Object.keys(conflictsByType).map((type) => (
          <Button
            key={type}
            type={currentType === type ? 'primary' : 'default'}
            onClick={() => setCurrentType(type)}
          >
            {type}
          </Button>
        ))}
      </Space>
      <ConflictAlert conflicts={conflictsByType[currentType]} />
    </Card>
  );
};

/**
 * 示例4: 可关闭的冲突提示
 */
export const ClosableConflictExample: React.FC = () => {
  const [visible, setVisible] = useState(true);

  const conflicts: ConflictInfo[] = [
    {
      promptName: '礼貌用语规范',
      conflictType: '语义冲突',
      conflictContent: '部门Prompt要求"可以使用口语化表达"，但全局Prompt要求"必须使用标准书面语"',
      suggestion: '建议修改部门Prompt，移除口语化表达的要求，或联系管理员调整全局Prompt',
    },
  ];

  return (
    <Card title="示例4: 可关闭的冲突提示">
      {visible ? (
        <ConflictAlert
          conflicts={conflicts}
          closable={true}
          onClose={() => {
            setVisible(false);
            console.log('冲突提示已关闭');
          }}
        />
      ) : (
        <div style={{ padding: 20, textAlign: 'center', color: '#999' }}>
          冲突提示已关闭
          <br />
          <Button
            type="link"
            onClick={() => setVisible(true)}
            style={{ marginTop: 8 }}
          >
            重新显示
          </Button>
        </div>
      )}
    </Card>
  );
};

/**
 * 示例5: 自定义样式
 */
export const CustomStyleExample: React.FC = () => {
  const conflicts: ConflictInfo[] = [
    {
      promptName: '礼貌用语规范',
      conflictType: '语义冲突',
      conflictContent: '部门Prompt要求"可以使用口语化表达"，但全局Prompt要求"必须使用标准书面语"',
      suggestion: '建议修改部门Prompt，移除口语化表达的要求，或联系管理员调整全局Prompt',
    },
  ];

  return (
    <Card title="示例5: 自定义样式">
      <ConflictAlert
        conflicts={conflicts}
        style={{
          marginTop: 20,
          marginBottom: 20,
          border: '2px solid #ff4d4f',
          boxShadow: '0 4px 12px rgba(255, 77, 79, 0.15)',
        }}
      />
    </Card>
  );
};

/**
 * 示例6: 无冲突状态
 */
export const NoConflictExample: React.FC = () => {
  return (
    <Card title="示例6: 无冲突状态">
      <ConflictAlert conflicts={[]} />
      <div style={{ padding: 20, textAlign: 'center', color: '#52c41a' }}>
        ✓ 没有检测到冲突，可以安全保存
      </div>
    </Card>
  );
};

/**
 * 完整示例页面
 */
export const ConflictAlertExamples: React.FC = () => {
  return (
    <div style={{ padding: 24, background: '#f0f2f5' }}>
      <h1>ConflictAlert 组件示例</h1>
      <Divider />

      <Space direction="vertical" size="large" style={{ width: '100%' }}>
        <SingleConflictExample />
        <MultipleConflictsExample />
        <DifferentConflictTypesExample />
        <ClosableConflictExample />
        <CustomStyleExample />
        <NoConflictExample />
      </Space>
    </div>
  );
};

export default ConflictAlertExamples;
