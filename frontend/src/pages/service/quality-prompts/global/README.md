# 全局Prompt管理页面

## 概述

全局Prompt管理页面用于管理适用于所有部门的通用质检标准。仅Super Admin角色可访问此页面。

## 功能特性

### 核心功能
- ✅ **列表展示**: 展示所有全局Prompt,支持分页
- ✅ **搜索功能**: 支持按名称或内容搜索,带500ms防抖优化
- ✅ **状态筛选**: 支持按启用/禁用状态筛选
- ✅ **新建Prompt**: 创建新的全局Prompt
- ✅ **编辑Prompt**: 编辑现有全局Prompt
- ✅ **删除Prompt**: 删除全局Prompt(带确认提示)
- ✅ **启用/禁用**: 快速切换Prompt状态
- ✅ **批量操作**: 支持批量启用/禁用

### 性能优化
- ✅ **搜索防抖**: 500ms延迟,减少不必要的API请求
- ✅ **表单草稿**: 每30秒自动保存表单草稿到localStorage
- ✅ **快捷键支持**:
  - `Ctrl+N`: 打开新建对话框
  - `Ctrl+R`: 刷新列表
  - `ESC`: 关闭对话框
- ✅ **React Query缓存**: 5分钟缓存时间,减少重复请求
- ✅ **加载状态**: 全局加载指示器,提升用户体验

### 权限控制
- ✅ **创建权限**: `service:quality-prompt:global:create`
- ✅ **更新权限**: `service:quality-prompt:global:update`
- ✅ **删除权限**: `service:quality-prompt:global:delete`

## 技术实现

### 使用的组件
- `BaseTable`: 基础表格组件(来自@/components/table/BaseTable)
- `BaseModal`: 基础对话框组件(来自@/components/common/BaseModal)
- `GlobalLoading`: 全局加载组件(来自@/components/common/GlobalLoading)
- `Permission`: 权限控制组件(来自@/components/permission/Permission)

### 使用的Hooks
- `useGlobalPrompts`: 全局Prompt数据管理Hook(来自@/hooks/useGlobalPrompts)
- `useFormDraft`: 表单草稿自动保存Hook(来自@/hooks/useFormDraft)
- `useKeyboardShortcuts`: 快捷键支持Hook(来自@/hooks/useKeyboardShortcuts)
- `useDebounce`: 防抖Hook(来自@/hooks/useDebounce)

### API集成
使用`@/api/quality-prompt`中的API客户端:
- `queryGlobalPrompts`: 查询全局Prompt列表
- `createGlobalPrompt`: 创建全局Prompt
- `updateGlobalPrompt`: 更新全局Prompt
- `deleteGlobalPrompt`: 删除全局Prompt
- `enableGlobalPrompt`: 启用全局Prompt
- `disableGlobalPrompt`: 禁用全局Prompt
- `batchEnablePrompts`: 批量启用
- `batchDisablePrompts`: 批量禁用

## 表单字段

| 字段名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | string | 是 | Prompt名称,最大100字符 |
| content | string | 是 | Prompt内容,最大5000字符,支持换行 |
| applicable_scenarios | string | 是 | 适用场景,最大500字符 |
| enabled | number | 否 | 状态: 1=启用, 0=禁用,默认1 |
| sort | number | 否 | 排序值,默认0,数值越小越靠前 |
| platform_id | string | 否 | 平台ID,默认'1' |

## 表格列

| 列名 | 字段 | 宽度 | 说明 |
|------|------|------|------|
| Prompt名称 | name | 200px | 支持省略号 |
| Prompt内容 | content | 300px | 支持省略号 |
| 适用场景 | applicable_scenarios | 200px | 支持省略号 |
| 状态 | enabled | 100px | 标签显示:启用/禁用 |
| 版本 | version | 80px | 版本号 |
| 排序 | sort | 80px | 排序值 |
| 创建时间 | created_at | 180px | 日期时间格式 |
| 操作 | - | 240px | 编辑/启用禁用/删除按钮 |

## 用户体验优化

### 空状态
当列表为空时,表格会显示"暂无数据"提示。

### 加载状态
- 列表加载时显示加载旋转器
- 表单提交时按钮显示loading状态
- 批量操作时显示确认对话框

### 错误处理
- 表单验证错误实时显示
- API错误通过message组件提示
- 删除操作需要二次确认

### 操作反馈
- 成功操作显示绿色成功消息(2秒自动消失)
- 失败操作显示红色错误消息(3秒自动消失)
- 批量操作显示操作摘要(成功X条,失败X条)

## 路由配置

路径: `/service/quality-prompts/global`

已在`frontend/.umirc.ts`中配置:
```typescript
{ path: '/service/quality-prompts/global', component: '@/pages/service/quality-prompts/global' }
```

## 菜单配置

需要在数据库`sys_menu`表中添加菜单记录:
- 菜单名称: 全局Prompt管理
- 菜单路径: /service/quality-prompts/global
- 父菜单: 客服管理
- 权限代码: service:quality-prompt:global:view

## 测试建议

### 功能测试
1. 测试新建Prompt功能
2. 测试编辑Prompt功能
3. 测试删除Prompt功能(包括确认对话框)
4. 测试启用/禁用切换
5. 测试批量启用/禁用
6. 测试搜索功能(包括防抖)
7. 测试状态筛选
8. 测试分页功能

### 性能测试
1. 测试搜索防抖(输入后500ms才发起请求)
2. 测试表单草稿自动保存(30秒间隔)
3. 测试React Query缓存(5分钟内不重复请求)

### 权限测试
1. 测试非Super Admin用户无法访问
2. 测试各操作按钮的权限控制

### 快捷键测试
1. 测试Ctrl+N打开新建对话框
2. 测试Ctrl+R刷新列表
3. 测试ESC关闭对话框

## 后续任务

根据tasks.md,后续需要实现:
- [ ] 7.2: 部门Prompt管理页面
- [ ] 7.3: 冲突校验UI组件
- [ ] 7.4: 版本管理组件
- [ ] 7.5: 模板库组件
- [ ] 7.6: 批量操作组件(导入/导出)
- [ ] 7.7: 预览功能组件
- [ ] 7.8: 审计日志组件

## 注意事项

1. **权限控制**: 确保后端API已实现权限守卫,前端权限控制只是UI层面
2. **数据验证**: 前端验证只是第一道防线,后端必须再次验证
3. **草稿保存**: localStorage有大小限制(通常5MB),注意清理旧草稿
4. **批量操作**: 批量操作可能耗时较长,考虑添加进度提示
5. **版本管理**: 当前页面未实现版本历史查看,需要在后续任务中实现
