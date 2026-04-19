# Quality Prompt Components

质检Prompt相关的UI组件集合。

## ConflictAlert

冲突校验警告组件，用于显示部门Prompt与全局Prompt之间的冲突详情。

### 功能特性

- ✅ 显示冲突数量和详细信息
- ✅ 支持多个冲突项的列表展示
- ✅ 区分不同冲突类型（语义冲突、关键词冲突等）
- ✅ 提供清晰的解决建议
- ✅ 支持关闭功能
- ✅ 阻止保存直到冲突解决
- ✅ 响应式设计，适配移动端

### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| conflicts | ConflictInfo[] | 是 | - | 冲突信息列表 |
| onClose | () => void | 否 | - | 关闭回调函数 |
| style | React.CSSProperties | 否 | - | 自定义样式 |
| closable | boolean | 否 | true | 是否显示关闭按钮 |
| showIcon | boolean | 否 | true | 是否显示图标 |

### ConflictInfo 接口

```typescript
interface ConflictInfo {
  /** 冲突的Prompt名称 */
  promptName: string;
  /** 冲突类型（语义冲突、关键词冲突等） */
  conflictType: string;
  /** 冲突的具体内容 */
  conflictContent: string;
  /** 建议解决方案 */
  suggestion: string;
}
```

### 使用示例

#### 基础用法

```tsx
import { ConflictAlert } from '@/components/quality-prompt';
import type { ConflictInfo } from '@/components/quality-prompt';

const conflicts: ConflictInfo[] = [
  {
    promptName: '礼貌用语规范',
    conflictType: '语义冲突',
    conflictContent: '部门Prompt要求"可以使用口语化表达"，但全局Prompt要求"必须使用标准书面语"',
    suggestion: '建议修改部门Prompt，移除口语化表达的要求，或联系管理员调整全局Prompt'
  }
];

function MyComponent() {
  return (
    <ConflictAlert
      conflicts={conflicts}
      onClose={() => console.log('关闭冲突提示')}
    />
  );
}
```

#### 在表单中使用

```tsx
import { useState } from 'react';
import { Form, Button } from 'antd';
import { ConflictAlert } from '@/components/quality-prompt';
import type { ConflictInfo } from '@/components/quality-prompt';

function PromptForm() {
  const [conflicts, setConflicts] = useState<ConflictInfo[]>([]);
  const [form] = Form.useForm();

  const handleSave = async () => {
    const values = await form.validateFields();

    // 执行冲突校验
    const isValid = await validateConflicts(values);
    if (!isValid) {
      // 冲突会自动显示在ConflictAlert组件中
      return;
    }

    // 保存数据
    await savePrompt(values);
  };

  const validateConflicts = async (values: any): Promise<boolean> => {
    // 调用API进行冲突校验
    const response = await api.validatePrompt(values);

    if (response.conflicts.length > 0) {
      setConflicts(response.conflicts);
      return false;
    }

    return true;
  };

  return (
    <div>
      <ConflictAlert
        conflicts={conflicts}
        onClose={() => setConflicts([])}
      />

      <Form form={form}>
        {/* 表单字段 */}
      </Form>

      <Button
        type="primary"
        onClick={handleSave}
        disabled={conflicts.length > 0}
      >
        保存
      </Button>
    </div>
  );
}
```

#### 自定义样式

```tsx
<ConflictAlert
  conflicts={conflicts}
  style={{
    marginTop: 20,
    marginBottom: 20,
  }}
  closable={false}
  showIcon={true}
/>
```

### 冲突类型和颜色

组件会根据冲突类型自动应用不同的标签颜色：

- **语义冲突**: 红色 (red)
- **关键词冲突**: 橙色 (orange)
- **逻辑冲突**: 火山红 (volcano)
- **规则冲突**: 洋红 (magenta)
- **其他**: 错误红 (error)

### 设计原则

1. **清晰性**: 使用明确的视觉层次和颜色区分，让用户快速识别冲突
2. **可操作性**: 提供具体的解决建议，而不仅仅是错误提示
3. **阻断性**: 在冲突未解决前阻止用户保存，确保数据一致性
4. **友好性**: 使用友好的语言和图标，降低用户的挫败感

---

## VersionHistory

版本历史组件，用于显示Prompt的版本历史记录，支持查看详情、版本对比和回滚操作。

### 功能特性

- ✅ 时间线展示版本列表
- ✅ 显示版本号、创建时间、创建人、变更说明
- ✅ 支持查看版本详情
- ✅ 支持版本对比（选择两个版本进行对比）
- ✅ 支持版本回滚（恢复到指定版本）
- ✅ 当前版本高亮显示
- ✅ 回滚前确认提示
- ✅ 加载状态和空状态处理

### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| promptId | string | 是 | - | Prompt ID |
| promptType | 'global' \| 'department' | 是 | - | Prompt类型 |
| versions | VersionRecord[] | 是 | - | 版本历史列表 |
| loading | boolean | 否 | false | 是否加载中 |
| onRollback | (versionId: string) => Promise<void> | 否 | - | 回滚回调 |
| onViewDetail | (version: VersionRecord) => void | 否 | - | 查看详情回调 |
| onCompare | (oldVersion: VersionRecord, newVersion: VersionRecord) => void | 否 | - | 对比版本回调 |
| style | React.CSSProperties | 否 | - | 自定义样式 |

### 使用示例

#### 基础用法

```tsx
import { VersionHistory } from '@/components/quality-prompt';
import type { VersionRecord } from '@/api/quality-prompt';

function MyComponent() {
  const versions: VersionRecord[] = [
    {
      id: 'v1',
      prompt_id: 'prompt-123',
      prompt_type: 'global',
      version: 1,
      content: '版本1内容',
      applicable_scenarios: '场景1',
      modified_by: 'user1',
      modified_by_name: '张三',
      modified_at: '2024-01-01T10:00:00Z',
      change_description: '初始版本',
    },
  ];

  const handleRollback = async (versionId: string) => {
    await api.rollbackVersion(versionId);
  };

  return (
    <VersionHistory
      promptId="prompt-123"
      promptType="global"
      versions={versions}
      onRollback={handleRollback}
    />
  );
}
```

#### 完整功能示例

```tsx
import { useState } from 'react';
import { Modal } from 'antd';
import { VersionHistory, VersionDiff } from '@/components/quality-prompt';

function VersionManagement() {
  const [compareModalVisible, setCompareModalVisible] = useState(false);
  const [selectedVersions, setSelectedVersions] = useState<{
    old: VersionRecord | null;
    new: VersionRecord | null;
  }>({ old: null, new: null });

  const handleViewDetail = (version: VersionRecord) => {
    Modal.info({
      title: `版本 ${version.version} 详情`,
      content: (
        <div>
          <p>内容: {version.content}</p>
          <p>场景: {version.applicable_scenarios}</p>
        </div>
      ),
    });
  };

  const handleCompare = (oldVersion: VersionRecord, newVersion: VersionRecord) => {
    setSelectedVersions({ old: oldVersion, new: newVersion });
    setCompareModalVisible(true);
  };

  return (
    <>
      <VersionHistory
        promptId="prompt-123"
        promptType="global"
        versions={versions}
        onRollback={handleRollback}
        onViewDetail={handleViewDetail}
        onCompare={handleCompare}
      />

      <Modal
        title="版本对比"
        open={compareModalVisible}
        onCancel={() => setCompareModalVisible(false)}
        width={1200}
      >
        {selectedVersions.old && selectedVersions.new && (
          <VersionDiff
            oldVersion={selectedVersions.old}
            newVersion={selectedVersions.new}
          />
        )}
      </Modal>
    </>
  );
}
```

---

## VersionDiff

版本对比组件，用于并排显示两个版本的内容差异。

### 功能特性

- ✅ 并排显示两个版本的内容
- ✅ 高亮显示差异部分
- ✅ 字段级别的对比（name, content, applicable_scenarios等）
- ✅ 使用颜色标记新增、删除、修改
- ✅ 显示变更统计
- ✅ 显示版本元信息
- ✅ 自动检测无变化情况

### Props

| 属性 | 类型 | 必填 | 默认值 | 说明 |
|------|------|------|--------|------|
| oldVersion | VersionRecord | 是 | - | 旧版本 |
| newVersion | VersionRecord | 是 | - | 新版本 |
| style | React.CSSProperties | 否 | - | 自定义样式 |

### 使用示例

#### 基础用法

```tsx
import { VersionDiff } from '@/components/quality-prompt';
import type { VersionRecord } from '@/api/quality-prompt';

function MyComponent() {
  const oldVersion: VersionRecord = {
    id: 'v1',
    version: 1,
    content: '旧版本内容',
    // ... 其他字段
  };

  const newVersion: VersionRecord = {
    id: 'v2',
    version: 2,
    content: '新版本内容',
    // ... 其他字段
  };

  return (
    <VersionDiff
      oldVersion={oldVersion}
      newVersion={newVersion}
    />
  );
}
```

### 变更类型和颜色

组件会根据变更类型自动应用不同的颜色：

- **新增**: 绿色背景 (#f6ffed)，绿色边框 (#52c41a)
- **删除**: 红色背景 (#fff2f0)，红色边框 (#ff4d4f)
- **修改**: 黄色背景 (#fffbe6)，黄色边框 (#faad14)
- **未变更**: 灰色背景 (#fafafa)，灰色边框 (#d9d9d9)

---

## 无障碍支持

所有组件都遵循以下无障碍原则：

- 使用语义化的HTML结构
- 支持键盘导航
- 提供清晰的文本描述
- 使用ARIA属性增强可访问性

## 浏览器兼容性

- Chrome >= 90
- Firefox >= 88
- Safari >= 14
- Edge >= 90

## 相关组件

- `BaseModal`: 模态框基础组件
- `EmptyState`: 空状态组件
- `GlobalLoading`: 全局加载组件

## 更新日志

#### v1.1.0 (2024-01-XX)
- 新增 VersionHistory 组件
- 新增 VersionDiff 组件
- 新增版本管理功能

#### v1.0.0 (2024-01-XX)
- 初始版本发布
- 支持多冲突项展示
- 支持冲突类型标签
- 支持解决建议显示
