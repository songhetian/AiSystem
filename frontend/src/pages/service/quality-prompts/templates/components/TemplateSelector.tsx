import React, { useState } from 'react';
import { Modal, List, Card, Tag, Space, Input, Select, Empty, Button } from 'antd';
import { CheckCircleOutlined, EyeOutlined } from '@ant-design/icons';
import type { PromptTemplate } from '@/api/quality-prompt';

interface TemplateSelectorProps {
  /**
   * 是否显示对话框
   */
  open: boolean;
  /**
   * 模板列表
   */
  templates: PromptTemplate[];
  /**
   * 关闭对话框回调
   */
  onClose: () => void;
  /**
   * 选择模板回调
   */
  onSelect: (template: PromptTemplate) => void;
}

/**
 * 模板选择器组件
 * 用于从模板库中选择一个模板应用到Prompt
 *
 * 功能:
 * - 显示所有可用模板
 * - 支持搜索和筛选
 * - 支持预览模板内容
 * - 选择模板后返回给父组件
 *
 * 需求: 8.3, 8.4
 */
export const TemplateSelector: React.FC<TemplateSelectorProps> = ({
  open,
  templates,
  onClose,
  onSelect,
}) => {
  const [searchKeyword, setSearchKeyword] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<string | undefined>(undefined);
  const [selectedTemplate, setSelectedTemplate] = useState<PromptTemplate | null>(null);

  // 获取所有分类
  const categories = Array.from(new Set(templates.map((t) => t.category)));

  // 过滤模板
  const filteredTemplates = templates.filter((template) => {
    const matchKeyword =
      !searchKeyword ||
      template.name.toLowerCase().includes(searchKeyword.toLowerCase()) ||
      template.content.toLowerCase().includes(searchKeyword.toLowerCase());
    const matchCategory = !categoryFilter || template.category === categoryFilter;
    return matchKeyword && matchCategory;
  });

  // 处理选择
  const handleSelect = () => {
    if (selectedTemplate) {
      onSelect(selectedTemplate);
      setSelectedTemplate(null);
      setSearchKeyword('');
      setCategoryFilter(undefined);
    }
  };

  // 处理取消
  const handleCancel = () => {
    setSelectedTemplate(null);
    setSearchKeyword('');
    setCategoryFilter(undefined);
    onClose();
  };

  return (
    <Modal
      title="选择模板"
      open={open}
      onCancel={handleCancel}
      onOk={handleSelect}
      okText="应用模板"
      cancelText="取消"
      width={800}
      okButtonProps={{ disabled: !selectedTemplate }}
      destroyOnClose
    >
      <div style={{ marginBottom: 16 }}>
        <Space style={{ width: '100%' }}>
          <Input.Search
            placeholder="搜索模板名称或内容"
            allowClear
            style={{ width: 300 }}
            value={searchKeyword}
            onChange={(e) => setSearchKeyword(e.target.value)}
          />
          <Select
            placeholder="分类筛选"
            allowClear
            style={{ width: 200 }}
            value={categoryFilter}
            onChange={setCategoryFilter}
            options={[
              { label: '全部分类', value: undefined },
              ...categories.map((cat) => ({ label: cat, value: cat })),
            ]}
          />
        </Space>
      </div>

      {filteredTemplates.length === 0 ? (
        <Empty description="没有找到匹配的模板" image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <List
          dataSource={filteredTemplates}
          style={{ maxHeight: 500, overflowY: 'auto' }}
          renderItem={(template) => (
            <List.Item
              key={template.id}
              style={{
                cursor: 'pointer',
                background: selectedTemplate?.id === template.id ? '#e6f7ff' : 'transparent',
                padding: 12,
                borderRadius: 4,
                marginBottom: 8,
              }}
              onClick={() => setSelectedTemplate(template)}
            >
              <Card
                size="small"
                style={{ width: '100%', border: selectedTemplate?.id === template.id ? '2px solid #1890ff' : '1px solid #d9d9d9' }}
                bodyStyle={{ padding: 12 }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flex: 1 }}>
                    <div style={{ display: 'flex', alignItems: 'center', marginBottom: 8 }}>
                      <span style={{ fontWeight: 'bold', fontSize: 16, marginRight: 8 }}>
                        {template.name}
                      </span>
                      {selectedTemplate?.id === template.id && (
                        <CheckCircleOutlined style={{ color: '#1890ff', fontSize: 18 }} />
                      )}
                    </div>
                    <Space style={{ marginBottom: 8 }}>
                      <Tag color="blue">{template.category}</Tag>
                      <Tag color="green">{template.industry}</Tag>
                      <Tag color={template.is_builtin ? 'gold' : 'default'}>
                        {template.is_builtin ? '内置' : '自定义'}
                      </Tag>
                    </Space>
                    <div style={{ color: '#666', fontSize: 13, marginBottom: 8 }}>
                      {template.description || '无描述'}
                    </div>
                    <div
                      style={{
                        color: '#999',
                        fontSize: 12,
                        maxHeight: 60,
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        display: '-webkit-box',
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: 'vertical',
                      }}
                    >
                      {template.content}
                    </div>
                  </div>
                </div>
              </Card>
            </List.Item>
          )}
        />
      )}

      {selectedTemplate && (
        <div style={{ marginTop: 16, padding: 12, background: '#f5f5f5', borderRadius: 4 }}>
          <div style={{ fontWeight: 'bold', marginBottom: 8 }}>已选择模板:</div>
          <div style={{ color: '#666' }}>{selectedTemplate.name}</div>
        </div>
      )}
    </Modal>
  );
};
