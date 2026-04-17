# 全局统一组件使用规范

## 📋 概述

本目录包含项目所有全局统一组件，**所有页面必须使用这些统一组件，禁止自定义同类组件**。

特殊场景需产品经理书面审批，审批通过后同步至开发、测试全团队。

## 🎯 核心原则

1. **统一性**：所有页面使用相同的组件，确保交互体验一致
2. **禁止自定义**：禁止在页面内自定义与全局组件功能一致的基础组件
3. **审批流程**：特殊场景需走审批流程，审批通过后纳入全局组件库

## 📦 组件清单

### 1. BaseTable - 统一表格

**路径**: `components/table/BaseTable.tsx`

**功能**:

- 支持分页、排序、筛选、批量操作
- 默认配置：每页10条，最大支持50条/页
- 统一的加载状态、空状态展示

**使用示例**:

```tsx
import BaseTable from "@/components/table/BaseTable";

<BaseTable
  columns={columns}
  dataSource={data}
  loading={loading}
  pagination={{
    current: page,
    pageSize: 10,
    total: total,
  }}
  onChange={handleTableChange}
/>;
```

### 2. BaseForm - 统一表单

**路径**: `components/form/BaseForm.tsx`

**功能**:

- 支持表单验证、联动、禁用状态控制
- 表单布局统一为上下布局，标签宽度120px
- 统一的提交、重置按钮样式

**使用示例**:

```tsx
import BaseForm from "@/components/form/BaseForm";

<BaseForm
  form={form}
  onFinish={handleSubmit}
  layout="vertical"
  labelWidth={120}
>
  {/* 表单项 */}
</BaseForm>;
```

### 3. BaseModal - 统一弹窗

**路径**: `components/common/BaseModal.tsx`

**功能**:

- 弹窗标题、按钮（确认/取消）样式统一
- 弹窗大小按内容自适应，最小宽度400px
- 统一的打开/关闭动画

**使用示例**:

```tsx
import BaseModal from "@/components/common/BaseModal";

<BaseModal
  title="标题"
  open={visible}
  onOk={handleOk}
  onCancel={handleCancel}
  width={600}
>
  {/* 弹窗内容 */}
</BaseModal>;
```

### 4. BaseDrag - 统一拖拽

**路径**: `components/drag/BaseDrag.tsx`

**功能**:

- 拖拽样式、触发反馈、动画效果统一
- 拖拽过程中显示临时占位符
- 拖拽完成后自动保存

**使用示例**:

```tsx
import BaseDrag from "@/components/drag/BaseDrag";

<BaseDrag
  items={items}
  onDragEnd={handleDragEnd}
  renderItem={(item) => <div>{item.name}</div>}
/>;
```

### 5. BaseUpload - 统一上传

**路径**: `components/common/BaseUpload.tsx`

**功能**:

- 支持单文件/多文件上传、拖拽上传
- 文件格式/大小校验
- 默认限制单个文件不超过100MB
- 统一的上传进度展示

**使用示例**:

```tsx
import BaseUpload from "@/components/common/BaseUpload";

<BaseUpload
  maxSize={100}
  accept=".jpg,.png,.pdf"
  multiple={true}
  onChange={handleUpload}
/>;
```

### 6. ActionGroup - 操作组

**路径**: `components/common/ActionGroup.tsx`

**功能**:

- 查看/编辑/删除操作按钮
- 按钮顺序固定为"查看→编辑→删除"
- 禁用状态统一灰化，hover效果一致

**使用示例**:

```tsx
import ActionGroup from "@/components/common/ActionGroup";

<ActionGroup
  onView={() => handleView(record)}
  onEdit={() => handleEdit(record)}
  onDelete={() => handleDelete(record)}
  permissions={{
    view: true,
    edit: hasEditPermission,
    delete: hasDeletePermission,
  }}
/>;
```

### 7. Permission - 权限控制

**路径**: `components/permission/Permission.tsx`

**功能**:

- 按钮/区域权限控制
- 无权限时，按钮隐藏、区域置灰且不可点击
- 禁止仅隐藏不做权限拦截

**使用示例**:

```tsx
import Permission from "@/components/permission/Permission";

<Permission code="user:add">
  <Button type="primary">新增用户</Button>
</Permission>;
```

### 8. StatusTag - 状态标签

**路径**: `components/common/StatusTag.tsx`

**功能**:

- 状态颜色、文案统一
- 启用=绿色、禁用=灰色、异常=红色
- 标签圆角统一为4px

**使用示例**:

```tsx
import StatusTag from '@/components/common/StatusTag';

<StatusTag status="active" text="启用" />
<StatusTag status="inactive" text="禁用" />
<StatusTag status="error" text="异常" />
```

## 🚫 禁止行为

1. ❌ 在页面内自定义与全局组件功能一致的组件
2. ❌ 修改全局组件的核心样式和行为逻辑
3. ❌ 随意扩展全局组件的属性
4. ❌ 仅在单个页面内使用自定义组件

## ✅ 特殊场景审批流程

### 1. 提交申请

开发人员填写《组件自定义申请表》，包含：

- 自定义原因
- 组件功能描述
- 使用场景说明
- 现有组件无法满足的具体原因

### 2. 产品审批

产品经理进行书面审批，评估是否确实需要自定义组件

### 3. 团队同步

审批通过后，同步至前端、后端、测试全团队，明确组件使用规范

### 4. 纳入组件库

自定义组件开发完成后，必须纳入全局公共组件库，统一维护

## 📝 组件开发规范

### 命名规范

- 组件名称采用 PascalCase 命名法
- 组件文件名与组件名称保持一致
- 组件必须有清晰的注释说明

### 类型定义

- 所有组件必须使用 TypeScript
- Props 必须定义明确的类型
- 禁止使用 any 类型

### 样式规范

- 使用 CSS Modules 或 styled-components
- 样式命名采用 BEM 规范
- 禁止使用内联样式

### 文档规范

- 每个组件必须有使用文档
- 文档包含：功能说明、Props 说明、使用示例
- 复杂组件需要提供多个使用场景示例

## 🔧 维护与更新

### 组件更新流程

1. 提出更新需求
2. 技术负责人评审
3. 开发并测试
4. 更新文档
5. 通知全团队

### 版本管理

- 组件库统一版本管理
- 重大变更需升级主版本号
- 向后兼容的更新升级次版本号

## 📞 联系方式

如有疑问或建议，请联系：

- 技术负责人：[姓名]
- 前端负责人：[姓名]

---

**最后更新时间**: 2026-04-15
**文档版本**: V1.0
