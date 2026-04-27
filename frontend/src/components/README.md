# 组件库使用指南

欢迎使用雷犀AI客服管理系统的前端组件库！本组件库提供了一套完整的企业级UI组件，帮助您快速构建美观、高效的用户界面。

---

## 📦 组件分类

### 基础UI组件 (`@/components/ui`)
通用的UI组件，可在任何场景使用：
- **Card** - 卡片组件
- **Button** - 按钮组件
- **Tag** - 标签组件
- **Badge** - 徽章组件
- **Table** - 表格组件
- **Modal** - 模态框组件
- **Drawer** - 抽屉组件
- **Form** - 表单组件

### 布局组件 (`@/components/layout`)
页面布局相关组件：
- **PageContainer** - 页面容器
- **ContentWrapper** - 内容包装器
- **SectionCard** - 区块卡片

### 业务组件 (`@/components/business`)
业务场景专用组件：
- **PageHeader** - 页面头部
- **FilterBar** - 筛选栏
- **ActionBar** - 操作栏
- **StatusTag** - 状态标签
- **MetricsCard** - 指标卡片
- **Timeline** - 时间轴

---

## 🚀 快速开始

### 1. 导入组件

```tsx
// 导入基础UI组件
import { Card, Button, Table } from '@/components/ui';

// 导入布局组件
import { PageContainer, SectionCard } from '@/components/layout';

// 导入业务组件
import { FilterBar, StatusTag } from '@/components/business';
```

### 2. 使用组件

```tsx
import React from 'react';
import { PageContainer, SectionCard } from '@/components/layout';
import { Button, Table } from '@/components/ui';

const MyPage: React.FC = () => {
  return (
    <PageContainer title="我的页面">
      <SectionCard title="数据列表">
        <Button type="primary">新增</Button>
        <Table columns={columns} dataSource={data} />
      </SectionCard>
    </PageContainer>
  );
};

export default MyPage;
```

---

## 🎨 设计系统

### 颜色系统

```tsx
// 主色调 - 石板色
@primary-500: #64748b;

// 品牌蓝
@brand-600: #2563eb;

// 功能色
@success-600: #059669;  // 成功
@warning-600: #d97706;  // 警告
@danger-600: #dc2626;   // 危险
@info-600: #0284c7;     // 信息
```

### 间距系统

```tsx
@spacing-1: 4px;   // 最小间距
@spacing-2: 8px;   // 小间距
@spacing-3: 12px;  // 中小间距
@spacing-4: 16px;  // 默认间距
@spacing-5: 20px;  // 中间距
@spacing-6: 24px;  // 大间距
@spacing-8: 32px;  // 超大间距
```

### 阴影系统

```tsx
@shadow-sm: 0 2px 4px rgba(0, 0, 0, 0.04);   // 小阴影
@shadow-md: 0 4px 6px rgba(0, 0, 0, 0.07);   // 中阴影
@shadow-lg: 0 10px 15px rgba(0, 0, 0, 0.1);  // 大阴影
@shadow-xl: 0 20px 25px rgba(0, 0, 0, 0.1);  // 超大阴影
```

---

## 💡 常用示例

### 列表页面

```tsx
import React from 'react';
import { PageContainer, SectionCard } from '@/components/layout';
import { FilterBar, ActionBar, StatusTag } from '@/components/business';
import { Table, Button } from '@/components/ui';
import { PlusOutlined } from '@ant-design/icons';

const ListPage: React.FC = () => {
  return (
    <PageContainer title="用户管理">
      {/* 筛选区域 */}
      <SectionCard title="筛选条件">
        <FilterBar
          items={[
            { name: 'name', label: '姓名', type: 'input' },
            { name: 'status', label: '状态', type: 'select', options: [...] },
          ]}
          onSearch={(values) => console.log(values)}
        />
      </SectionCard>

      {/* 数据区域 */}
      <SectionCard>
        <ActionBar
          actions={[
            {
              key: 'add',
              label: '新增',
              icon: <PlusOutlined />,
              type: 'primary',
              onClick: () => {},
            },
          ]}
        />
        <Table columns={columns} dataSource={data} />
      </SectionCard>
    </PageContainer>
  );
};
```

### 详情页面

```tsx
import React from 'react';
import { PageContainer, SectionCard } from '@/components/layout';
import { PageHeader } from '@/components/business';
import { Button, Tag } from '@/components/ui';

const DetailPage: React.FC = () => {
  return (
    <PageContainer>
      <PageHeader
        title="用户详情"
        tags={<Tag color="success">启用</Tag>}
        extra={<Button type="primary">编辑</Button>}
        showBack
        onBack={() => history.back()}
      />

      <SectionCard title="基本信息">
        {/* 详情内容 */}
      </SectionCard>

      <SectionCard title="操作记录">
        {/* 操作记录 */}
      </SectionCard>
    </PageContainer>
  );
};
```

### 表单页面

```tsx
import React from 'react';
import { PageContainer, SectionCard } from '@/components/layout';
import { Form, Button } from '@/components/ui';
import { Input, Select } from 'antd';

const FormPage: React.FC = () => {
  const [form] = Form.useForm();

  return (
    <PageContainer title="新增用户">
      <SectionCard>
        <Form
          form={form}
          layout="vertical"
          onFinish={(values) => console.log(values)}
        >
          <Form.Item name="name" label="姓名" required>
            <Input />
          </Form.Item>

          <Form.Item name="status" label="状态">
            <Select options={[...]} />
          </Form.Item>

          <Form.Item>
            <Button type="primary" htmlType="submit">
              提交
            </Button>
          </Form.Item>
        </Form>
      </SectionCard>
    </PageContainer>
  );
};
```

---

## 🎯 最佳实践

### 1. 使用毛玻璃效果

```tsx
// 为卡片添加毛玻璃效果
<Card glass shadow="xl">
  内容
</Card>

// 为模态框添加毛玻璃效果
<Modal glass visible={visible}>
  内容
</Modal>
```

### 2. 统一状态显示

```tsx
// 使用StatusTag显示状态
<StatusTag status="active" />      // 启用
<StatusTag status="inactive" />    // 禁用
<StatusTag status="processing" />  // 处理中
<StatusTag status="success" />     // 成功
<StatusTag status="error" />       // 失败
```

### 3. 响应式筛选

```tsx
// FilterBar自动响应式布局
<FilterBar
  items={filterItems}
  collapsible        // 支持展开/收起
  defaultRows={1}    // 默认显示1行
/>
```

### 4. 高密度表格

```tsx
// 使用紧凑模式显示更多数据
<Table
  columns={columns}
  dataSource={data}
  density="compact"  // 紧凑模式
  striped           // 斑马纹
  glass             // 毛玻璃效果
/>
```

---

## 📚 更多文档

- **组件使用示例**: `docs/组件使用示例.md`
- **实施计划**: `docs/前端页面优化实施计划.md`
- **实施进度**: `docs/前端页面优化实施进度.md`
- **完成总结**: `docs/前端组件库完成总结.md`

---

## 🤝 贡献指南

### 添加新组件

1. 在对应目录创建组件文件夹
2. 创建 `types.ts`、`index.tsx`、`index.module.less`
3. 在 `index.ts` 中导出组件
4. 添加使用示例到文档

### 组件开发规范

- 使用TypeScript定义类型
- 使用CSS Modules避免样式冲突
- 支持毛玻璃效果（glass prop）
- 提供完整的props配置
- 添加注释和文档

---

## 📞 联系我们

如有问题或建议，请联系开发团队。

---

**最后更新**: 2026-04-27
**版本**: 1.0.0
