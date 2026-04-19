# Quality Prompt Hooks 使用文档

本文档介绍质检Prompt功能相关的自定义React Hooks。

## 概述

为了简化质检Prompt功能的前端开发,我们创建了以下5个自定义Hooks:

1. **useGlobalPrompts** - 全局Prompt管理
2. **useDepartmentPrompts** - 部门Prompt管理
3. **usePromptTemplates** - 模板库管理
4. **useDebounce** - 防抖处理(已存在)
5. **useAutoSave** - 自动保存

## 1. useGlobalPrompts

管理全局Prompt数据,使用React Query实现缓存和自动刷新。

### 基本用法

```tsx
import { useGlobalPrompts } from '@/hooks';

function GlobalPromptList() {
  const {
    data,           // Prompt列表数据
    total,          // 总数
    isLoading,      // 加载状态
    create,         // 创建方法
    update,         // 更新方法
    remove,         // 删除方法
    enable,         // 启用方法
    disable,        // 禁用方法
    refetch,        // 刷新方法
  } = useGlobalPrompts({
    platform_id: '123',
    keyword: 'test',
    page: 1,
    pageSize: 20,
  });

  return (
    <div>
      {isLoading ? (
        <Spin />
      ) : (
        <List
          dataSource={data}
          renderItem={(item) => (
            <List.Item
              actions={[
                <Button onClick={() => enable(item.id)}>启用</Button>,
                <Button onClick={() => disable(item.id)}>禁用</Button>,
                <Button onClick={() => remove(item.id)}>删除</Button>,
              ]}
            >
              {item.name}
            </List.Item>
          )}
        />
      )}
    </div>
  );
}
```

### 创建Prompt

```tsx
const { create, isCreating } = useGlobalPrompts();

const handleCreate = () => {
  create({
    name: '礼貌用语检查',
    content: '检查客服是否使用礼貌用语...',
    applicable_scenarios: '所有对话',
    platform_id: '123',
    enabled: 1,
  });
};
```

### 批量操作

```tsx
const { batchEnable, batchDisable } = useGlobalPrompts();

const handleBatchEnable = (ids: string[]) => {
  batchEnable(ids);
};
```

### API

#### 返回值

| 属性 | 类型 | 说明 |
|------|------|------|
| data | GlobalPrompt[] | Prompt列表数据 |
| total | number | 总数 |
| page | number | 当前页码 |
| pageSize | number | 每页数量 |
| isLoading | boolean | 是否加载中 |
| error | Error \| null | 错误信息 |
| create | (dto) => void | 创建Prompt |
| createAsync | (dto) => Promise | 异步创建 |
| update | (id, dto) => void | 更新Prompt |
| updateAsync | (id, dto) => Promise | 异步更新 |
| remove | (id) => void | 删除Prompt |
| removeAsync | (id) => Promise | 异步删除 |
| enable | (id) => void | 启用Prompt |
| disable | (id) => void | 禁用Prompt |
| batchEnable | (ids) => void | 批量启用 |
| batchDisable | (ids) => void | 批量禁用 |
| refetch | () => void | 刷新数据 |
| isCreating | boolean | 是否创建中 |
| isUpdating | boolean | 是否更新中 |
| isDeleting | boolean | 是否删除中 |

## 2. useDepartmentPrompts

管理部门Prompt数据,API与useGlobalPrompts相同。

### 基本用法

```tsx
import { useDepartmentPrompts } from '@/hooks';

function DepartmentPromptList() {
  const {
    data,
    isLoading,
    create,
    update,
    remove,
  } = useDepartmentPrompts({
    dept_id: '456',
    platform_id: '123',
  });

  return (
    // ... 组件实现
  );
}
```

### 创建部门Prompt

```tsx
const { create } = useDepartmentPrompts();

const handleCreate = () => {
  create({
    name: '部门专属检查',
    content: '检查部门特定规则...',
    applicable_scenarios: '售后对话',
    platform_id: '123',
    dept_id: '456',
    parent_global_prompt_id: 'global-123', // 可选,关联全局Prompt
    enabled: 1,
  });
};
```

## 3. usePromptTemplates

管理Prompt模板库数据。

### 基本用法

```tsx
import { usePromptTemplates } from '@/hooks';

function TemplateSelector() {
  const {
    data,           // 模板列表
    categories,     // 分类列表
    industries,     // 行业列表
    isLoading,      // 加载状态
    create,         // 创建模板
    update,         // 更新模板
    remove,         // 删除模板
    getById,        // 获取模板详情
  } = usePromptTemplates({
    category: 'politeness',
    industry: 'e-commerce',
  });

  return (
    <div>
      <Select placeholder="选择分类">
        {categories.map(cat => (
          <Select.Option key={cat} value={cat}>{cat}</Select.Option>
        ))}
      </Select>

      <List
        dataSource={data}
        renderItem={(template) => (
          <List.Item>
            <Card
              title={template.name}
              extra={
                <Button onClick={() => applyTemplate(template)}>
                  应用模板
                </Button>
              }
            >
              {template.description}
            </Card>
          </List.Item>
        )}
      />
    </div>
  );
}
```

### 创建自定义模板

```tsx
const { create } = usePromptTemplates();

const handleCreateTemplate = () => {
  create({
    name: '我的自定义模板',
    content: '模板内容...',
    category: 'custom',
    industry: 'general',
    description: '模板描述',
  });
};
```

### API

#### 返回值

| 属性 | 类型 | 说明 |
|------|------|------|
| data | PromptTemplate[] | 模板列表 |
| categories | string[] | 分类列表 |
| industries | string[] | 行业列表 |
| isLoading | boolean | 是否加载中 |
| create | (dto) => void | 创建模板 |
| update | (id, dto) => void | 更新模板 |
| remove | (id) => void | 删除模板 |
| getById | (id) => Promise | 获取模板详情 |
| refetch | () => void | 刷新数据 |

## 4. useDebounce

防抖Hook,用于搜索输入等场景。

### 基本用法

```tsx
import { useDebounce } from '@/hooks';
import { useState } from 'react';

function SearchInput() {
  const [keyword, setKeyword] = useState('');
  const debouncedKeyword = useDebounce(keyword, 500);

  // debouncedKeyword 会在用户停止输入500ms后更新
  useEffect(() => {
    if (debouncedKeyword) {
      // 执行搜索
      searchPrompts(debouncedKeyword);
    }
  }, [debouncedKeyword]);

  return (
    <Input
      placeholder="搜索Prompt"
      value={keyword}
      onChange={(e) => setKeyword(e.target.value)}
    />
  );
}
```

## 5. useAutoSave

通用自动保存Hook,支持任意数据类型。

### 基本用法

```tsx
import { useAutoSave } from '@/hooks';
import { useState } from 'react';

function PromptEditor() {
  const [formData, setFormData] = useState({
    name: '',
    content: '',
  });

  const {
    lastSavedAt,    // 最后保存时间
    isSaving,       // 是否保存中
    clearDraft,     // 清除草稿
    restoreDraft,   // 恢复草稿
    saveDraft,      // 手动保存
    hasDraft,       // 是否有草稿
  } = useAutoSave(formData, {
    key: 'prompt-editor-draft',
    interval: 30000, // 30秒自动保存
    enabled: true,
    validate: (data) => data.name.length > 0, // 验证函数
    onSave: (data) => {
      console.log('已保存:', data);
    },
  });

  // 组件加载时恢复草稿
  useEffect(() => {
    const draft = restoreDraft();
    if (draft) {
      Modal.confirm({
        title: '发现未保存的草稿',
        content: '是否恢复?',
        onOk: () => setFormData(draft),
        onCancel: () => clearDraft(),
      });
    }
  }, []);

  // 提交成功后清除草稿
  const handleSubmit = async () => {
    await savePrompt(formData);
    clearDraft();
  };

  return (
    <div>
      <Input
        value={formData.name}
        onChange={(e) => setFormData({ ...formData, name: e.target.value })}
      />

      <TextArea
        value={formData.content}
        onChange={(e) => setFormData({ ...formData, content: e.target.value })}
      />

      <div>
        {lastSavedAt && (
          <Text type="secondary">
            最后保存: {lastSavedAt.toLocaleString()}
          </Text>
        )}
        {isSaving && <Spin size="small" />}
      </div>

      <Button onClick={handleSubmit}>提交</Button>
      <Button onClick={() => saveDraft()}>手动保存</Button>
    </div>
  );
}
```

### 与 useFormDraft 的区别

| 特性 | useAutoSave | useFormDraft |
|------|-------------|--------------|
| 数据类型 | 任意类型 | Ant Design Form |
| 验证 | 支持自定义验证 | 无 |
| 回调 | 支持 onSave/onError | 无 |
| 状态 | 提供 isSaving/lastSavedAt | 无 |
| 手动保存 | 支持 | 不支持 |
| 检查草稿 | 支持 hasDraft() | 不支持 |

**建议:**
- 使用 Ant Design Form 时,优先使用 `useFormDraft`
- 需要更多控制和状态时,使用 `useAutoSave`

## 完整示例

### 全局Prompt管理页面

```tsx
import React, { useState } from 'react';
import { Button, Table, Input, Space, Modal, Form, message } from 'antd';
import {
  useGlobalPrompts,
  useDebounce,
  useAutoSave,
} from '@/hooks';

function GlobalPromptManagement() {
  const [keyword, setKeyword] = useState('');
  const [page, setPage] = useState(1);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [editingPrompt, setEditingPrompt] = useState(null);

  const debouncedKeyword = useDebounce(keyword, 500);

  const {
    data,
    total,
    isLoading,
    create,
    update,
    remove,
    enable,
    disable,
    batchEnable,
    batchDisable,
  } = useGlobalPrompts({
    keyword: debouncedKeyword,
    page,
    pageSize: 20,
  });

  const columns = [
    {
      title: '名称',
      dataIndex: 'name',
      key: 'name',
    },
    {
      title: '内容',
      dataIndex: 'content',
      key: 'content',
      ellipsis: true,
    },
    {
      title: '状态',
      dataIndex: 'enabled',
      key: 'enabled',
      render: (enabled: number) => (
        <Tag color={enabled ? 'green' : 'red'}>
          {enabled ? '已启用' : '已禁用'}
        </Tag>
      ),
    },
    {
      title: '操作',
      key: 'actions',
      render: (_, record) => (
        <Space>
          <Button size="small" onClick={() => setEditingPrompt(record)}>
            编辑
          </Button>
          {record.enabled ? (
            <Button size="small" onClick={() => disable(record.id)}>
              禁用
            </Button>
          ) : (
            <Button size="small" onClick={() => enable(record.id)}>
              启用
            </Button>
          )}
          <Button
            size="small"
            danger
            onClick={() => {
              Modal.confirm({
                title: '确认删除',
                content: `确定要删除 "${record.name}" 吗?`,
                onOk: () => remove(record.id),
              });
            }}
          >
            删除
          </Button>
        </Space>
      ),
    },
  ];

  return (
    <div>
      <Space style={{ marginBottom: 16 }}>
        <Input
          placeholder="搜索Prompt"
          value={keyword}
          onChange={(e) => setKeyword(e.target.value)}
          style={{ width: 300 }}
        />
        <Button type="primary" onClick={() => setEditingPrompt({})}>
          新建Prompt
        </Button>
        <Button
          disabled={selectedIds.length === 0}
          onClick={() => batchEnable(selectedIds)}
        >
          批量启用
        </Button>
        <Button
          disabled={selectedIds.length === 0}
          onClick={() => batchDisable(selectedIds)}
        >
          批量禁用
        </Button>
      </Space>

      <Table
        rowKey="id"
        columns={columns}
        dataSource={data}
        loading={isLoading}
        rowSelection={{
          selectedRowKeys: selectedIds,
          onChange: (keys) => setSelectedIds(keys as string[]),
        }}
        pagination={{
          current: page,
          total,
          pageSize: 20,
          onChange: setPage,
        }}
      />

      {/* 编辑对话框 */}
      {editingPrompt && (
        <PromptEditModal
          prompt={editingPrompt}
          onClose={() => setEditingPrompt(null)}
          onSave={(values) => {
            if (editingPrompt.id) {
              update({ id: editingPrompt.id, data: values });
            } else {
              create(values);
            }
            setEditingPrompt(null);
          }}
        />
      )}
    </div>
  );
}

export default GlobalPromptManagement;
```

## 最佳实践

### 1. 缓存策略

React Query 会自动缓存数据,默认配置:
- **staleTime**: 5分钟 (数据被认为是新鲜的时间)
- **gcTime**: 10分钟 (缓存垃圾回收时间)

### 2. 错误处理

所有hooks都内置了错误处理,会自动显示错误消息。如需自定义:

```tsx
const { create } = useGlobalPrompts();

try {
  await createAsync(data);
  // 自定义成功处理
} catch (error) {
  // 自定义错误处理
}
```

### 3. 乐观更新

对于需要即时反馈的操作,可以使用乐观更新:

```tsx
const queryClient = useQueryClient();

const handleToggle = (id: string, enabled: boolean) => {
  // 乐观更新
  queryClient.setQueryData(['global-prompts'], (old) => {
    return {
      ...old,
      data: old.data.map(item =>
        item.id === id ? { ...item, enabled: enabled ? 1 : 0 } : item
      ),
    };
  });

  // 执行实际操作
  if (enabled) {
    enable(id);
  } else {
    disable(id);
  }
};
```

### 4. 防抖搜索

搜索输入应该使用防抖:

```tsx
const [keyword, setKeyword] = useState('');
const debouncedKeyword = useDebounce(keyword, 500);

const { data } = useGlobalPrompts({
  keyword: debouncedKeyword, // 使用防抖后的值
});
```

### 5. 自动保存

长表单应该使用自动保存:

```tsx
const [formData, setFormData] = useState({});
const { clearDraft, restoreDraft } = useAutoSave(formData, {
  key: 'my-form',
  interval: 30000,
});

// 提交成功后清除草稿
const handleSubmit = async () => {
  await save(formData);
  clearDraft();
};
```

## 注意事项

1. **权限控制**: 确保用户有相应权限才能执行操作
2. **数据验证**: 提交前验证数据完整性
3. **错误处理**: 处理网络错误和业务错误
4. **性能优化**: 使用防抖、节流避免频繁请求
5. **缓存管理**: 合理设置缓存时间,避免数据过期

## 相关文档

- [React Query 文档](https://tanstack.com/query/latest)
- [Ant Design 文档](https://ant.design/)
- [质检Prompt API 文档](../api/quality-prompt/README.md)
