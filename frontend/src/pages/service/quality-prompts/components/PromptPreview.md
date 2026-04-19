# PromptPreview 组件文档

## 概述

`PromptPreview` 是一个用于预览质检Prompt效果的对话框组件。它允许用户在保存Prompt之前，输入测试对话内容并查看质检结果，包括分数、违规详情和改进建议。

## 功能特性

- ✅ 输入测试对话内容
- ✅ 执行质检预览（不持久化到数据库）
- ✅ 显示质检分数（带进度圆环）
- ✅ 显示违规详情列表（区分全局/部门规则）
- ✅ 显示改进建议
- ✅ 支持重新运行预览
- ✅ 加载状态指示
- ✅ 空状态提示
- ✅ 响应式设计

## API

### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| open | boolean | 是 | - | 是否显示对话框 |
| onClose | () => void | 是 | - | 关闭对话框回调 |
| promptContent | string | 是 | - | 当前Prompt内容 |
| title | string | 否 | 'Prompt预览' | 对话框标题 |

### 类型定义

```typescript
interface PromptPreviewProps {
  open: boolean;
  onClose: () => void;
  promptContent: string;
  title?: string;
}
```

## 使用示例

### 基础用法

```tsx
import { useState } from 'react';
import { Button } from 'antd';
import { PromptPreview } from '@/pages/service/quality-prompts/components';

function MyComponent() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [promptContent, setPromptContent] = useState('');

  return (
    <>
      <Button onClick={() => setPreviewOpen(true)}>
        预览
      </Button>

      <PromptPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        promptContent={promptContent}
      />
    </>
  );
}
```

### 在表单中使用

```tsx
import { useState } from 'react';
import { Form, Input, Button, message } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { PromptPreview } from '@/pages/service/quality-prompts/components';

function PromptForm() {
  const [form] = Form.useForm();
  const [previewOpen, setPreviewOpen] = useState(false);

  const handlePreview = () => {
    const content = form.getFieldValue('content');
    if (!content) {
      message.warning('请先输入Prompt内容');
      return;
    }
    setPreviewOpen(true);
  };

  return (
    <>
      <Form form={form}>
        <Form.Item name="content" label="Prompt内容">
          <Input.TextArea rows={8} />
        </Form.Item>

        <Form.Item>
          <Button icon={<EyeOutlined />} onClick={handlePreview}>
            预览质检效果
          </Button>
        </Form.Item>
      </Form>

      <PromptPreview
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        promptContent={form.getFieldValue('content') || ''}
        title="质检Prompt预览"
      />
    </>
  );
}
```

### 在表格中使用

```tsx
import { useState } from 'react';
import { Table, Button, Space } from 'antd';
import { EyeOutlined } from '@ant-design/icons';
import { PromptPreview } from '@/pages/service/quality-prompts/components';

function PromptTable() {
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedPrompt, setSelectedPrompt] = useState(null);

  const handlePreview = (record) => {
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
      <Table columns={columns} dataSource={data} />

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
```

## 预览结果结构

预览执行成功后，会显示以下信息：

### 1. 质检分数

- 圆形进度条显示分数（0-100）
- 颜色编码：
  - 绿色（≥90分）：优秀
  - 橙色（70-89分）：良好
  - 红色（<70分）：需改进
- 显示总违规数、总扣分、质检结果（通过/不通过）

### 2. 违规详情

每条违规记录包含：
- 序号
- 违规规则名称
- 来源标签（全局规则/部门规则）
- 扣分值
- 来源Prompt名称

### 3. 改进建议

列表形式显示所有改进建议，帮助用户优化Prompt内容。

## 交互流程

1. 用户打开预览对话框
2. 输入测试对话内容（必填，10-5000字符）
3. 点击"执行预览"按钮
4. 系统调用API执行质检（显示加载状态）
5. 显示质检结果
6. 用户可以：
   - 修改测试对话内容并重新运行预览
   - 点击"重置"清空输入和结果
   - 点击"关闭"退出对话框

## 注意事项

1. **不持久化**：预览功能仅用于测试，不会将结果保存到数据库
2. **实时内容**：使用当前表单中的Prompt内容，而非已保存的版本
3. **验证规则**：测试对话内容必须至少10个字符，最多5000个字符
4. **错误处理**：API调用失败时会显示错误消息
5. **性能优化**：使用React Query的mutation管理API调用状态

## 依赖项

- `antd`: UI组件库
- `@tanstack/react-query`: 状态管理和API调用
- `@/api/quality-prompt`: API客户端

## 相关需求

本组件实现了以下需求：

- **需求 10.1**: 提供预览按钮
- **需求 10.2**: 显示测试对话框
- **需求 10.3**: 允许输入测试对话内容
- **需求 10.4**: 执行质检使用当前Prompt内容
- **需求 10.5**: 显示质检结果（分数、违规、建议）
- **需求 10.6**: 允许修改Prompt并重新运行预览
- **需求 10.7**: 不持久化预览结果

## 样式定制

组件使用内联样式和Ant Design主题，可以通过以下方式定制：

1. **对话框宽度**：通过Modal的`width`属性（默认900px）
2. **颜色方案**：通过`getScoreColor`函数修改分数颜色
3. **布局间距**：通过内联样式的`marginBottom`、`padding`等属性

## 测试建议

1. **单元测试**：
   - 测试表单验证规则
   - 测试API调用成功/失败场景
   - 测试结果显示逻辑

2. **集成测试**：
   - 测试完整的预览流程
   - 测试重新运行预览功能
   - 测试重置和关闭功能

3. **E2E测试**：
   - 测试用户交互流程
   - 测试不同分数范围的显示效果
   - 测试空状态和加载状态

## 更新日志

### v1.0.0 (2025-01-XX)
- ✅ 初始版本发布
- ✅ 实现基础预览功能
- ✅ 实现质检结果展示
- ✅ 实现重新运行预览
- ✅ 实现加载和空状态
