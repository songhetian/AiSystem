# 批量操作组件文档

## 概述

批量操作组件提供了对Prompt记录进行批量管理的功能，包括批量启用、禁用、删除以及导入导出功能。

## BatchOperationBar 组件

### 功能描述

`BatchOperationBar` 是一个通用的批量操作工具栏组件，可以在全局Prompt和部门Prompt页面中复用。

### Props接口

```typescript
interface BatchOperationBarProps {
  selectedRowKeys: string[];           // 已选择的记录ID列表
  promptType: 'global' | 'department'; // Prompt类型
  onCancelSelection: () => void;       // 取消选择回调
  onBatchEnable?: () => void;          // 批量启用回调
  onBatchDisable?: () => void;         // 批量禁用回调
  onBatchDelete?: () => void;          // 批量删除回调
  onImportSuccess?: () => void;        // 导入成功回调
  showDelete?: boolean;                // 是否显示删除按钮（默认true）
  showImportExport?: boolean;          // 是否显示导入/导出按钮（默认true）
}
```

### 功能特性

#### 1. 批量启用/禁用
- 显示已选择的记录数量
- 批量启用或禁用选中的Prompt
- 操作前需要用户确认
- 支持自定义回调函数

#### 2. 批量删除
- 批量删除选中的Prompt
- 显示警告提示（不可恢复）
- 需要用户二次确认
- 危险操作使用红色按钮

#### 3. 导入功能
- 支持Excel文件导入（.xlsx, .xls）
- 自动调用对应的API（全局/部门）
- 显示导入结果（成功/失败数量）
- 失败时显示详细错误信息
- 导入成功后触发刷新回调

#### 4. 导出功能
- 导出当前所有Prompt到Excel文件
- 文件名自动包含类型和日期
- 格式: `全局Prompt_2026-04-19.xlsx`
- 使用浏览器下载功能

### 使用示例

#### 基础用法

```typescript
import { BatchOperationBar } from '../components/BatchOperationBar';

const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

<BatchOperationBar
  selectedRowKeys={selectedRowKeys}
  promptType="global"
  onCancelSelection={() => setSelectedRowKeys([])}
  onBatchEnable={handleBatchEnable}
  onBatchDisable={handleBatchDisable}
  onBatchDelete={handleBatchDelete}
  onImportSuccess={() => refetch()}
/>
```

#### 自定义显示选项

```typescript
// 不显示删除按钮
<BatchOperationBar
  selectedRowKeys={selectedRowKeys}
  promptType="department"
  onCancelSelection={() => setSelectedRowKeys([])}
  onBatchEnable={handleBatchEnable}
  onBatchDisable={handleBatchDisable}
  showDelete={false}
  showImportExport={true}
/>

// 只显示批量操作，不显示导入导出
<BatchOperationBar
  selectedRowKeys={selectedRowKeys}
  promptType="global"
  onCancelSelection={() => setSelectedRowKeys([])}
  onBatchEnable={handleBatchEnable}
  onBatchDisable={handleBatchDisable}
  showImportExport={false}
/>
```

#### 完整集成示例

```typescript
import { useState } from 'react';
import { BatchOperationBar } from '../components/BatchOperationBar';
import { BaseTable } from '@/components/table/BaseTable';

export default function PromptManagementPage() {
  const [selectedRowKeys, setSelectedRowKeys] = useState<string[]>([]);

  const {
    data,
    batchEnable,
    batchDisable,
    batchDelete,
    refetch,
  } = useGlobalPrompts();

  const handleBatchEnable = () => {
    batchEnable(selectedRowKeys);
    setSelectedRowKeys([]);
  };

  const handleBatchDisable = () => {
    batchDisable(selectedRowKeys);
    setSelectedRowKeys([]);
  };

  const handleBatchDelete = () => {
    batchDelete(selectedRowKeys);
    setSelectedRowKeys([]);
  };

  return (
    <Card>
      {selectedRowKeys.length > 0 && (
        <BatchOperationBar
          selectedRowKeys={selectedRowKeys}
          promptType="global"
          onCancelSelection={() => setSelectedRowKeys([])}
          onBatchEnable={handleBatchEnable}
          onBatchDisable={handleBatchDisable}
          onBatchDelete={handleBatchDelete}
          onImportSuccess={() => refetch()}
        />
      )}

      <BaseTable
        rowKey="id"
        dataSource={data}
        rowSelection={{
          selectedRowKeys,
          onChange: (keys) => setSelectedRowKeys(keys as string[]),
        }}
      />
    </Card>
  );
}
```

### API依赖

#### 全局Prompt
- `qualityPromptApi.importGlobalPrompts(file)` - 导入全局Prompt
- `qualityPromptApi.exportGlobalPrompts()` - 导出全局Prompt

#### 部门Prompt
- `qualityPromptApi.importDepartmentPrompts(file)` - 导入部门Prompt
- `qualityPromptApi.exportDepartmentPrompts()` - 导出部门Prompt

### 导入文件格式

Excel文件应包含以下列:
- `name` - Prompt名称（必填）
- `content` - Prompt内容（必填）
- `applicable_scenarios` - 适用场景（必填）
- `enabled` - 启用状态（0或1）
- `sort` - 排序值
- `platform_id` - 平台ID（全局Prompt）
- `dept_id` - 部门ID（部门Prompt）
- `parent_global_prompt_id` - 关联全局Prompt ID（部门Prompt，可选）

### 导出文件格式

导出的Excel文件包含所有Prompt记录的完整信息:
- 所有字段信息
- 格式化的日期时间
- 可直接用于导入

### 样式说明

#### 工具栏样式
- 背景色: `#e6f7ff` (浅蓝色)
- 内边距: `8px 16px`
- 圆角: `4px`
- 布局: Flexbox，两端对齐

#### 按钮样式
- 尺寸: `small`
- 批量删除: 危险按钮（红色）
- 其他操作: 默认按钮

### 用户体验优化

#### 1. 确认对话框
- 所有批量操作都需要用户确认
- 显示操作影响的记录数量
- 危险操作（删除）有额外警告

#### 2. 操作反馈
- 导入成功: 显示成功数量
- 导入失败: 显示详细错误列表
- 导出成功: 显示成功消息
- 操作失败: 显示错误原因

#### 3. 加载状态
- 导入时显示loading状态
- 导出时显示loading状态
- 防止重复操作

#### 4. 错误处理
- 文件格式验证
- API调用错误捕获
- 友好的错误提示

### 需求映射

本组件实现了以下需求:

- **需求 9.1**: 批量启用/禁用操作
- **需求 9.2**: 批量删除操作
- **需求 9.3**: 导入Excel文件
- **需求 9.4**: 导出Excel文件
- **需求 9.5**: 操作确认提示
- **需求 9.6**: 显示操作摘要
- **需求 9.7**: 错误处理和反馈

### 权限控制

批量操作需要相应的权限:
- 批量启用/禁用: `service:quality-prompt:global:update` 或 `service:quality-prompt:department:update`
- 批量删除: `service:quality-prompt:global:delete` 或 `service:quality-prompt:department:delete`
- 导入: `service:quality-prompt:global:import` 或 `service:quality-prompt:department:import`
- 导出: `service:quality-prompt:global:export` 或 `service:quality-prompt:department:export`

### 注意事项

1. **文件大小限制**: 导入文件不应超过10MB
2. **记录数量限制**: 单次导入建议不超过1000条记录
3. **数据验证**: 导入时会进行完整的数据验证
4. **冲突检测**: 部门Prompt导入时会进行冲突检测
5. **事务处理**: 导入操作使用事务，失败会回滚
6. **异步处理**: 大量数据导入可能需要较长时间

### 测试建议

#### 功能测试
- [ ] 测试批量启用功能
- [ ] 测试批量禁用功能
- [ ] 测试批量删除功能
- [ ] 测试导入Excel文件
- [ ] 测试导出Excel文件
- [ ] 测试取消选择功能

#### 边界测试
- [ ] 测试未选择记录时的提示
- [ ] 测试导入空文件
- [ ] 测试导入格式错误的文件
- [ ] 测试导入超大文件
- [ ] 测试网络错误时的处理

#### 用户体验测试
- [ ] 测试确认对话框显示
- [ ] 测试操作反馈消息
- [ ] 测试加载状态显示
- [ ] 测试错误提示清晰度

### 扩展建议

1. **进度显示**: 导入大文件时显示进度条
2. **预览功能**: 导入前预览数据
3. **模板下载**: 提供导入模板下载
4. **批量编辑**: 支持批量修改字段
5. **导出筛选**: 支持导出筛选后的数据
6. **导出格式**: 支持CSV、JSON等其他格式

## 总结

BatchOperationBar组件提供了完整的批量操作功能，包括批量启用、禁用、删除以及导入导出。组件设计灵活，可以根据需要显示或隐藏特定功能。通过Props配置，可以轻松集成到不同的页面中。组件包含完整的错误处理和用户反馈机制，提供良好的用户体验。
