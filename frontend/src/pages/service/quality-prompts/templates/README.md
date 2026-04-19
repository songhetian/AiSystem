# Prompt模板库页面

本目录包含Prompt模板库管理功能的所有组件和页面。

## 文件结构

```
templates/
├── index.tsx                          # 主页面组件
├── components/
│   ├── TemplateSelector.tsx          # 模板选择器组件
│   ├── TemplatePreview.tsx           # 模板预览组件
│   └── index.ts                      # 组件导出文件
└── README.md                         # 本文档
```

## 主要功能

### 1. 模板库主页面 (index.tsx)

**功能**:
- 显示所有可用的Prompt模板（内置模板 + 自定义模板）
- 支持列表视图和网格视图切换
- 支持按分类和行业筛选
- 支持搜索模板名称和内容
- 支持创建、编辑、删除自定义模板
- 支持预览模板内容
- 支持应用模板到Prompt

**视图模式**:
- **列表视图**: 表格形式显示，包含所有字段信息
- **网格视图**: 卡片形式显示，更直观美观

**权限控制**:
- `service:quality-prompt:template:create` - 创建自定义模板
- `service:quality-prompt:template:update` - 编辑自定义模板
- `service:quality-prompt:template:delete` - 删除自定义模板
- `service:quality-prompt:template:apply` - 应用模板

**特性**:
- 内置模板不可编辑和删除（只读）
- 自定义模板可以完全管理
- 搜索防抖（500ms）
- 响应式布局

### 2. 模板选择器组件 (TemplateSelector.tsx)

**功能**:
- 从模板库中选择一个模板
- 支持搜索和分类筛选
- 显示模板的关键信息
- 高亮显示已选择的模板

**Props**:
```typescript
interface TemplateSelectorProps {
  open: boolean;                              // 是否显示对话框
  templates: PromptTemplate[];                // 模板列表
  onClose: () => void;                        // 关闭回调
  onSelect: (template: PromptTemplate) => void; // 选择回调
}
```

**使用场景**:
- 在创建新Prompt时选择基础模板
- 快速应用预定义的质检标准

**使用示例**:
```tsx
import { TemplateSelector } from './components/TemplateSelector';

const [selectorOpen, setSelectorOpen] = useState(false);

<TemplateSelector
  open={selectorOpen}
  templates={templates}
  onClose={() => setSelectorOpen(false)}
  onSelect={(template) => {
    // 处理选择的模板
    console.log('Selected template:', template);
    setSelectorOpen(false);
  }}
/>
```

### 3. 模板预览组件 (TemplatePreview.tsx)

**功能**:
- 显示模板的完整信息
- 显示模板的完整内容
- 只读模式，不可编辑

**Props**:
```typescript
interface TemplatePreviewProps {
  open: boolean;              // 是否显示对话框
  template: PromptTemplate;   // 要预览的模板
  onClose: () => void;        // 关闭回调
}
```

**显示内容**:
- 模板名称
- 分类和行业标签
- 模板类型（内置/自定义）
- 创建时间
- 描述信息
- 完整的模板内容

**使用示例**:
```tsx
import { TemplatePreview } from './components/TemplatePreview';

const [previewOpen, setPreviewOpen] = useState(false);
const [previewTemplate, setPreviewTemplate] = useState<PromptTemplate | null>(null);

<TemplatePreview
  open={previewOpen}
  template={previewTemplate!}
  onClose={() => {
    setPreviewOpen(false);
    setPreviewTemplate(null);
  }}
/>
```

## 数据管理

### 使用的Hook

**usePromptTemplates**:
```typescript
const {
  data: templates,        // 模板列表
  categories,            // 所有分类
  industries,            // 所有行业
  isLoading,            // 加载状态
  create,               // 创建模板
  update,               // 更新模板
  remove,               // 删除模板
  isCreating,           // 创建中状态
  isUpdating,           // 更新中状态
  refetch,              // 刷新数据
} = usePromptTemplates({
  keyword: debouncedKeyword,
  category: categoryFilter,
  industry: industryFilter,
});
```

### API端点

- `GET /api/quality-prompts/templates` - 查询模板列表
- `GET /api/quality-prompts/templates/:id` - 获取模板详情
- `POST /api/quality-prompts/templates` - 创建自定义模板
- `PUT /api/quality-prompts/templates/:id` - 更新自定义模板
- `DELETE /api/quality-prompts/templates/:id` - 删除自定义模板
- `GET /api/quality-prompts/templates/categories` - 获取分类列表
- `GET /api/quality-prompts/templates/industries` - 获取行业列表

## 模板分类

### 预置分类
- **礼貌用语**: 客服对话中的礼貌规范
- **合规性**: 法律法规和公司政策合规要求
- **流程规范**: 标准服务流程和操作规范
- **专业术语**: 行业专业术语使用规范
- **情绪管理**: 客户情绪识别和应对策略

### 行业分类
- **电商**: 电子商务行业
- **金融**: 金融服务行业
- **售后**: 售后服务行业
- **通用**: 适用于所有行业

## 需求映射

本页面实现了以下需求:

- **需求 8.1**: 提供预置模板 - 内置模板涵盖常见场景
- **需求 8.2**: 行业特定模板 - 支持按行业分类
- **需求 8.3**: 模板选择 - TemplateSelector组件
- **需求 8.4**: 模板预览 - TemplatePreview组件
- **需求 8.5**: 自定义模板创建 - 支持创建和编辑
- **需求 8.6**: 模板分类和搜索 - 完整的筛选和搜索功能
- **需求 8.7**: 模板管理 - Super Admin可管理所有模板

## 样式说明

### 列表视图
- 使用BaseTable组件
- 表格宽度: 1200px
- 支持横向滚动
- 分页: 每页20条

### 网格视图
- 使用CSS Grid布局
- 响应式列数: `repeat(auto-fill, minmax(300px, 1fr))`
- 卡片间距: 16px
- 卡片悬停效果

### 颜色方案
- 内置模板: 金色标签 (gold)
- 自定义模板: 默认标签 (default)
- 分类标签: 蓝色 (blue)
- 行业标签: 绿色 (green)

## 用户体验优化

### 1. 搜索防抖
- 使用useDebounce hook
- 延迟: 500ms
- 避免频繁API请求

### 2. 视图切换
- 列表视图: 适合查看详细信息
- 网格视图: 适合浏览和选择

### 3. 权限控制
- 内置模板只读保护
- 自定义模板完全可控
- 基于Permission组件的权限检查

### 4. 操作反馈
- 创建/编辑/删除操作有明确的成功/失败提示
- 删除操作需要确认
- 加载状态显示

## 扩展建议

### 功能扩展
1. 支持模板导入/导出
2. 支持模板版本管理
3. 支持模板收藏功能
4. 支持模板使用统计
5. 支持模板评分和评论

### 性能优化
1. 实现虚拟滚动处理大量模板
2. 添加模板内容的懒加载
3. 优化搜索算法

### 用户体验
1. 添加模板使用教程
2. 提供模板推荐功能
3. 支持模板标签系统
4. 添加模板对比功能

## 测试建议

### 功能测试
- [ ] 测试列表视图和网格视图切换
- [ ] 测试搜索和筛选功能
- [ ] 测试创建自定义模板
- [ ] 测试编辑自定义模板
- [ ] 测试删除自定义模板
- [ ] 测试模板预览
- [ ] 测试模板选择器

### 权限测试
- [ ] 测试内置模板的只读保护
- [ ] 测试不同角色的权限控制
- [ ] 测试无权限用户的访问限制

### 边界测试
- [ ] 测试空模板列表的显示
- [ ] 测试搜索无结果的情况
- [ ] 测试长内容的显示和滚动
- [ ] 测试特殊字符的处理

## 注意事项

1. **内置模板保护**: 内置模板（is_builtin=1）不可编辑和删除
2. **权限检查**: 所有操作都需要相应的权限
3. **数据验证**: 表单提交前进行完整的字段验证
4. **错误处理**: 所有API调用都包含错误处理
5. **响应式设计**: 支持不同屏幕尺寸的显示

## 总结

模板库功能为用户提供了快速创建和管理Prompt的能力，通过预置模板和自定义模板的结合，既保证了质检标准的一致性，又提供了灵活性。组件设计遵循React最佳实践，具有良好的可维护性和扩展性。
