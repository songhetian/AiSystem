/**
 * PromptPreview组件使用示例
 *
 * 本文件展示如何在全局Prompt或部门Prompt管理页面中集成预览功能
 */

import React, { useState } from 'react';
import { Button, Form } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { PromptPreview } from './PromptPreview';

/**
 * 示例1: 在表单编辑对话框中添加预览按钮
 */
export function PromptFormWithPreview() {
  const [form] = Form.useForm();
  const [previewOpen, setPreviewOpen] = useState(false);
  const [currentPromptContent, setCurrentPromptContent] = useState('');

  // 打开预览对话框
  const handleOpenPreview = () => {
    // 获取当前表单中的Prompt内容
    const content = form.getFieldValue('content');
    if (!content) {
      message.warning('请先输入Prompt内容');
      return;
    }
    setCurrentPromptContent(content);
    setPreviewOpen(true);
  };

  return (
    <>
      <Form form={form} layout="vertical">
        <Form.Item
          label="Prompt内容"
          name="content"
          rules={[{ required: true, message: '请输入Prompt内容' }]}
        >
          <Input.TextArea
            rows={8}
            placeholder="请输入Prompt内容"
            showCount
            maxLength={5000}
          />
        </Form.Item>

        {/* 预览按钮 */}
        <Form.Item>
          <Button
            icon={<EyeOutlined />}
            onClick={handleOpenPreview}
          >
            预览质检效果
          </Button>
        </Form.Item>
      </Form>

      {/* 预览对话框 */}
      <PromptPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        promptContent={currentPromptContent}
        title="Prompt预览"
      />
    </>
  );
}

/**
 * 示例2: 在表格行操作中添加预览按钮
 */
export function PromptTableWithPreview() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState<any>(null);

  // 打开预览对话框
  const handlePreview = (record: any) => {
    setSelectedPrompt(record);
    setPreviewOpen(true);
  };

  const columns = [
    {
      title: 'Prompt名称',
      dataIndex: 'name',
    },
    {
      title: '操作',
      render: (_, record) => (
        <Space>
          <Button
            type="link"
            icon={<EyeOutlined />}
            onClick={() => handlePreview(record)}
          >
            预览
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <>
      <Table columns={columns} dataSource={[]} />

      {/* 预览对话框 */}
      {selectedPrompt && (
        <PromptPreview
          open={previewOpen}
          onClose={() => {
            setPreviewOpen(false);
            setSelectedPrompt(null);
          }}
          promptContent={selectedPrompt.content}
          title={`预览: ${selectedPrompt.name}`}
        />
      )}
    </>
  );
}

/**
 * 示例3: 在全局Prompt管理页面中集成预览功能
 *
 * 在 frontend/src/pages/service/quality-prompts/global/index.tsx 中:
 *
 * 1. 导入PromptPreview组件:
 *    import { PromptPreview } from '../components/PromptPreview';
 *
 * 2. 添加状态管理:
 *    const [previewOpen, setPreviewOpen] = useState(false);
 *
 * 3. 在表单对话框的footer中添加预览按钮:
 *    <BaseModal
 *      ...
 *      footer={[
 *        <Button key="preview" icon={<EyeOutlined />} onClick={() => {
 *          const content = form.getFieldValue('content');
 *          if (content) {
 *            setPreviewOpen(true);
 *          } else {
 *            message.warning('请先输入Prompt内容');
 *          }
 *        }}>
 *          预览
 *        </Button>,
 *        <Button key="cancel" onClick={handleCancel}>取消</Button>,
 *        <Button key="submit" type="primary" onClick={handleSave}>保存</Button>,
 *      ]}
 *    >
 *      ...表单内容...
 *    </BaseModal>
 *
 * 4. 在对话框外添加PromptPreview组件:
 *    <PromptPreview
 *      open={previewOpen}
 *      onClose={() => setPreviewOpen(false)}
 *      promptContent={form.getFieldValue('content') || ''}
 *      title="全局Prompt预览"
 *    />
 */
