# 质检Prompt共享组件

本目录包含质检Prompt管理功能的共享组件，可在全局Prompt和部门Prompt页面中复用。

## 组件列表

### 1. VersionHistory 组件

**文件**: `VersionHistory.tsx`

**功能**: 显示Prompt的版本历史列表，支持版本对比和回滚操作。

**Props**:
- `promptId: string` - Prompt的唯一标识符
- `promptType: 'global' | 'department'` - Prompt类型
- `currentVersion: number` - 当前版本号
- `open: boolean` - 是否显示对话框
- `onClose: () => void` - 关闭对话框的回调函数
- `onRollbackSuccess?: () => void` - 版本回滚成功后的回调函数

**特性**:
- 显示所有历史版本的列表
- 显示版本号、修改人、修改时间、变更描述
- 支持版本对比（查看两个版本之间的差异）
- 支持版本回滚（恢复到指定历史版本）
- 当前版本高亮显示
- 回滚操作需要确认

**使用示例**:
```tsx
import { VersionHistory } from '../components/VersionHistory';

const [versionHistoryOpen, setVersionHistoryOpen] = useState(false);
const [selectedPrompt, setSelectedPrompt] = useState<GlobalPrompt | null>(null);

// 打开版本历史
const handleViewVersionHistory = (record: GlobalPrompt) => {
  setSelectedPrompt(record);
  setVersionHistoryOpen(true);
};

// 版本回滚成功后刷新列表
const handleVersionRollbackSuccess = () => {
  refetch();
};

// 渲染
{selectedPrompt && (
  <VersionHistory
    promptId={selectedPrompt.id}
    promptType="global"
    currentVersion={selectedPrompt.version}
    open={versionHistoryOpen}
    onClose={() => {
      setVersionHistoryOpen(false);
      setSelectedPrompt(null);
    }}
    onRollbackSuccess={handleVersionRollbackSuccess}
  />
)}
```

### 2. VersionDiff 组件

**文件**: `VersionDiff.tsx`

**功能**: 显示两个版本之间的差异，使用diff视图高亮显示变更内容。

**Props**:
- `promptId: string` - Prompt的唯一标识符
- `promptType: 'global' | 'department'` - Prompt类型
- `versionId: string` - 版本记录ID
- `fromVersion: number` - 对比起始版本号
- `toVersion: number` - 对比目标版本号
- `open: boolean` - 是否显示对话框
- `onClose: () => void` - 关闭对话框的回调函数

**特性**:
- 并排显示两个版本的内容
- 高亮显示新增、删除、修改的内容
- 显示字段级别的变更详情
- 使用react-diff-viewer-continued库进行diff渲染
- 支持多字段对比

**使用示例**:
```tsx
import { VersionDiff } from '../components/VersionDiff';

const [diffModalOpen, setDiffModalOpen] = useState(false);
const [selectedVersion, setSelectedVersion] = useState<VersionRecord | null>(null);

// 打开版本对比
const handleCompare = (record: VersionRecord) => {
  setSelectedVersion(record);
  setDiffModalOpen(true);
};

// 渲染
{selectedVersion && (
  <VersionDiff
    open={diffModalOpen}
    onClose={() => {
      setDiffModalOpen(false);
      setSelectedVersion(null);
    }}
    promptId={promptId}
    promptType="global"
    versionId={selectedVersion.id}
    fromVersion={selectedVersion.version}
    toVersion={currentVersion}
  />
)}
```

## 依赖项

### 必需的npm包:
- `react-diff-viewer-continued` - 用于版本差异可视化
- `@tanstack/react-query` - 用于数据获取和缓存
- `antd` - UI组件库
- `dayjs` - 日期格式化

### API依赖:
- `qualityPromptApi.getGlobalPromptVersions(promptId)` - 获取全局Prompt版本历史
- `qualityPromptApi.getDepartmentPromptVersions(promptId)` - 获取部门Prompt版本历史
- `qualityPromptApi.rollbackGlobalPrompt(promptId, version)` - 回滚全局Prompt
- `qualityPromptApi.rollbackDepartmentPrompt(promptId, version)` - 回滚部门Prompt
- `qualityPromptApi.compareVersions(promptId, versionId, fromVersion, toVersion, type)` - 比较版本差异

## 需求映射

这些组件实现了以下需求:

- **需求 6.1**: 创建版本记录 - 每次修改Prompt时自动创建新版本
- **需求 6.2**: 增量版本号 - 版本号自动递增
- **需求 6.3**: 存储版本元数据 - 存储版本号、修改人、修改时间、变更描述
- **需求 6.4**: 查看版本历史 - VersionHistory组件显示所有历史版本
- **需求 6.5**: 版本对比 - VersionDiff组件显示版本差异
- **需求 6.6**: 版本回滚 - VersionHistory组件支持回滚到任何历史版本
- **需求 6.7**: 永久保留历史版本 - 所有版本都会被永久保留

## 样式说明

### VersionHistory样式:
- 使用Ant Design的Modal组件作为容器
- 表格宽度: 1000px
- 当前版本使用蓝色Tag高亮
- 回滚按钮使用danger样式（红色）

### VersionDiff样式:
- 使用Ant Design的Modal组件作为容器
- 表格宽度: 1200px
- 新增内容: 绿色背景 (#e6ffed)
- 删除内容: 红色背景 (#ffeef0)
- 使用等宽字体显示代码差异

## 注意事项

1. **权限控制**: 版本历史按钮需要相应的权限代码:
   - 全局Prompt: `service:quality-prompt:global:view`
   - 部门Prompt: `service:quality-prompt:department:view`

2. **版本回滚**: 回滚操作会创建一个新版本，内容与选定的历史版本相同，不会删除任何历史版本。

3. **性能优化**: 使用React Query进行数据缓存，避免重复请求。

4. **错误处理**: 所有API调用都包含错误处理，失败时会显示友好的错误消息。

5. **响应式设计**: 组件支持不同屏幕尺寸，表格可横向滚动。

## 未来扩展

可能的扩展功能:
- 支持版本标签（tag）
- 支持版本注释
- 支持版本比较的更多可视化选项
- 支持导出版本历史
- 支持版本搜索和过滤
