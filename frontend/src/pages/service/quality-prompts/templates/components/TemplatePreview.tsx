import React from 'react';
import { Modal, Descriptions, Tag, Divider } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import type { PromptTemplate } from '@/api/quality-prompt';
import dayjs from 'dayjs';

interface TemplatePreviewProps {
  /**
   * 是否显示对话框
   */
  open: boolean;
  /**
   * 要预览的模板
   */
  template: PromptTemplate;
  /**
   * 关闭对话框回调
   */
  onClose: () => void;
}

/**
 * 模板预览组件
 * 显示模板的完整信息和内容
 *
 * 功能:
 * - 显示模板元数据（名称、分类、行业、类型等）
 * - 显示完整的模板内容
 * - 只读模式，不可编辑
 *
 * 需求: 8.4
 */
export const TemplatePreview: React.FC<TemplatePreviewProps> = ({
  open,
  template,
  onClose,
}) => {
  return (
    <Modal
      title={
        <div>
          <EyeOutlined style={{ marginRight: 8 }} />
          模板预览
        </div>
      }
      open={open}
      onCancel={onClose}
      footer={null}
      width={900}
      destroyOnClose
    >
      <Descriptions bordered column={2} size="small">
        <Descriptions.Item label="模板名称" span={2}>
          <span style={{ fontWeight: 'bold', fontSize: 16 }}>{template.name}</span>
        </Descriptions.Item>
        <Descriptions.Item label="分类">
          <Tag color="blue">{template.category}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="行业">
          <Tag color="green">{template.industry}</Tag>
        </Descriptions.Item>
        <Descriptions.Item label="类型">
          <Tag color={template.is_builtin ? 'gold' : 'default'}>
            {template.is_builtin ? '内置模板' : '自定义模板'}
          </Tag>
        </Descriptions.Item>
        <Descriptions.Item label="创建时间">
          {dayjs(template.created_at).format('YYYY-MM-DD HH:mm:ss')}
        </Descriptions.Item>
        {template.description && (
          <Descriptions.Item label="描述" span={2}>
            {template.description}
          </Descriptions.Item>
        )}
      </Descriptions>

      <Divider orientation="left">模板内容</Divider>

      <div
        style={{
          padding: 16,
          background: '#f5f5f5',
          borderRadius: 4,
          maxHeight: 400,
          overflowY: 'auto',
          whiteSpace: 'pre-wrap',
          wordBreak: 'break-word',
          fontFamily: 'Consolas, Monaco, "Courier New", monospace',
          fontSize: 14,
          lineHeight: 1.6,
        }}
      >
        {template.content}
      </div>

      <div style={{ marginTop: 16, padding: 12, background: '#e6f7ff', borderRadius: 4 }}>
        <p style={{ margin: 0, fontSize: 12, color: '#666' }}>
          <strong>使用提示:</strong>
        </p>
        <ul style={{ margin: '8px 0 0 0', paddingLeft: 20, fontSize: 12, color: '#666' }}>
          <li>您可以基于此模板创建新的Prompt</li>
          <li>内置模板不可编辑，但可以复制内容后创建自定义模板</li>
          <li>自定义模板可以随时编辑和删除</li>
        </ul>
      </div>
    </Modal>
  );
};
