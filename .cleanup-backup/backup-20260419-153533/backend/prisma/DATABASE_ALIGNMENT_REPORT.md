# 数据库文件对齐报告

## 📋 执行日期
2026-04-19

## ✅ 对齐完成情况

### 1. Schema.prisma 状态
**结论**: ✅ 已完全包含所有表结构

`schema.prisma` 已包含以下质检Prompt相关表:
- ✅ `service_quality_prompt_global` - 全局质检Prompt表
- ✅ `service_quality_prompt_department` - 部门质检Prompt表
- ✅ `service_quality_prompt_template` - Prompt模板库表
- ✅ `service_quality_prompt_version` - Prompt版本历史表
- ✅ `service_quality_prompt_permission` - Prompt权限表
- ✅ `service_quality_prompt_audit_log` - Prompt审计日志表

**对应的migration文件**:
- `backend/prisma/migrations/20260418000000_add_quality_prompt_tables/migration.sql`

### 2. Seed.ts 对齐状态
**结论**: ✅ 已合并质检Prompt菜单和权限

已将 `seed-quality-prompt-menus.ts` 的内容合并到 `seed.ts`:

#### 新增菜单 (menuDefs):
```typescript
// 父菜单
{
  menu_name: "智能Prompt管理",
  menu_code: "service:quality-prompts",
  route: "",
  sort: 35,
  type: 1,
}

// 子菜单
- service:quality-prompts:global (全局Prompt管理)
- service:quality-prompts:department (部门Prompt管理)
- service:quality-prompts:templates (Prompt模板库)
- service:quality-prompts:audit-logs (Prompt审计日志)
```

#### 新增按钮 (buttonDefs):
- 全局Prompt: list, create, update, delete, enable, disable
- 部门Prompt: list, create, update, delete, enable, disable
- 模板库: list, create, update, delete
- 审计日志: list, export
- 版本管理: list, rollback
- 批量操作: batch enable/disable, import, export, preview

#### 新增API权限 (apiDefs):
- 31个质检Prompt相关API端点的权限配置

#### 父子菜单关系处理:
已在 `main()` 函数中添加逻辑,自动处理父子菜单关系:
```typescript
// 处理父子菜单关系
let parent_id = null;
if (item.menu_code.includes(":") && item.type === 2) {
  const parentCode = item.menu_code.split(":").slice(0, -1).join(":");
  const parentMenu = menus.find((m) => m.menu_code === parentCode);
  if (parentMenu) {
    parent_id = parentMenu.id;
  }
}
```

### 3. Migration文件对齐
**结论**: ✅ 无需额外对齐

#### 现有migration文件:
1. `20260405183000_unique_approval_biz_pair/migration.sql`
   - 修改approval_request表的唯一索引
   - 已在schema.prisma中体现为 `@@unique([biz_type, biz_id])`

2. `20260418000000_add_quality_prompt_tables/migration.sql`
   - 创建6个质检Prompt表
   - 已在schema.prisma中完整定义

3. `add-quality-prompt-menus.sql`
   - 纯SQL菜单插入脚本
   - **已合并到seed.ts,可以删除**

### 4. 独立SQL文件状态
**结论**: ⚠️ 需要保留但不再使用

- `backend/prisma/migrations/add-quality-prompt-menus.sql` - 可以删除(已合并到seed.ts)
- `backend/prisma/seed-quality-prompt-menus.ts` - 可以删除(已合并到seed.ts)

## 🗑️ 可以安全删除的文件

执行以下命令清理已合并的文件:

```bash
# 删除已合并的菜单seed脚本
rm backend/prisma/seed-quality-prompt-menus.ts

# 删除独立的SQL菜单脚本
rm backend/prisma/migrations/add-quality-prompt-menus.sql
```

## 📝 Migration目录清理建议

### ❌ 不建议删除migrations目录

**原因**:
1. **Prisma依赖**: Prisma使用migrations目录追踪数据库schema变更历史
2. **团队协作**: 其他开发者需要这些migration文件来同步数据库
3. **生产环境**: 生产环境部署时需要执行这些migration
4. **回滚能力**: 保留migration历史可以支持数据库回滚

### ✅ 正确的数据库初始化流程

#### 开发环境 (首次初始化):
```bash
# 1. 重置数据库并应用所有migration
npx prisma migrate reset

# 2. 或者手动执行
npx prisma migrate deploy
npx prisma db seed
```

#### 生产环境:
```bash
# 只执行migration,不执行seed
npx prisma migrate deploy
```

#### 添加新的数据库变更:
```bash
# 创建新的migration
npx prisma migrate dev --name your_migration_name
```

## 🔄 数据库同步状态

### Schema.prisma ↔️ Migrations
✅ **完全同步** - schema.prisma包含所有migration的表结构

### Seed.ts ↔️ 业务数据
✅ **完全同步** - seed.ts包含所有初始化数据:
- 系统角色和用户
- 菜单和按钮
- API权限
- 平台、部门、店铺
- 质检规则和敏感词
- 示例会话数据
- **质检Prompt菜单和权限** (新增)

## 📊 对齐验证清单

- [x] schema.prisma包含所有表定义
- [x] seed.ts包含质检Prompt菜单
- [x] seed.ts包含质检Prompt按钮
- [x] seed.ts包含质检Prompt API权限
- [x] seed.ts处理父子菜单关系
- [x] 独立的seed-quality-prompt-menus.ts已合并
- [x] 独立的add-quality-prompt-menus.sql已合并
- [x] migration文件保持完整(不删除)

## 🎯 最终结论

### ✅ 对齐完成
所有数据库相关文件已完全对齐:
1. **schema.prisma** - 包含所有表结构定义
2. **seed.ts** - 包含所有初始化数据(含质检Prompt菜单)
3. **migrations/** - 保留完整的变更历史

### 🗑️ 可删除文件
- `backend/prisma/seed-quality-prompt-menus.ts`
- `backend/prisma/migrations/add-quality-prompt-menus.sql`

### ⚠️ 不可删除
- `backend/prisma/migrations/` 目录及其内容(除add-quality-prompt-menus.sql外)

### 🚀 使用方式
```bash
# 完整初始化(开发环境)
cd backend
npx prisma migrate reset  # 会自动执行seed

# 或分步执行
npx prisma migrate deploy
npx prisma db seed

# 生产环境
npx prisma migrate deploy  # 不执行seed
```

## 📌 注意事项

1. **Migration历史**: 保留migrations目录是Prisma最佳实践
2. **团队协作**: 其他开发者依赖migration文件同步数据库
3. **版本控制**: migrations目录应该提交到Git
4. **生产部署**: 生产环境使用`migrate deploy`而不是`migrate reset`
5. **Seed数据**: seed.ts仅用于开发环境初始化,生产环境不执行

## 🔗 相关文档

- [Prisma Migrations文档](https://www.prisma.io/docs/concepts/components/prisma-migrate)
- [Prisma Seeding文档](https://www.prisma.io/docs/guides/database/seed-database)
- 项目Spec: `.kiro/specs/quality-inspection-prompt-integration/`
