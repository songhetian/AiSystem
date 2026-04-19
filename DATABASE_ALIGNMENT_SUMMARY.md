# 数据库文件对齐总结

## 📊 对齐完成情况

### ✅ 已完成的工作

#### 1. Schema.prisma 验证
- **状态**: ✅ 完全对齐
- **包含表**: 所有6个质检Prompt表已在schema.prisma中定义
- **对应Migration**: `20260418000000_add_quality_prompt_tables/migration.sql`

#### 2. Seed.ts 合并
- **状态**: ✅ 已合并质检Prompt菜单和权限
- **新增内容**:
  - 5个菜单项(1个父菜单 + 4个子菜单)
  - 28个按钮权限
  - 31个API权限配置
  - 父子菜单关系自动处理逻辑

#### 3. 文件清理
- **可删除文件**:
  - ✅ `backend/prisma/seed-quality-prompt-menus.ts` (已合并)
  - ✅ `backend/prisma/migrations/add-quality-prompt-menus.sql` (已合并)
- **保留文件**:
  - ✅ `backend/prisma/migrations/` 目录(Prisma需要)
  - ✅ 所有其他migration文件

## 🎯 回答您的问题

### Q1: schema.prisma是否包含migrations下所有SQL语句?
**答**: ✅ **是的,完全包含**

`schema.prisma` 已经包含了所有migration文件中定义的表结构:
- ✅ 20260405183000: approval_request的唯一索引 → 已体现为 `@@unique([biz_type, biz_id])`
- ✅ 20260418000000: 6个质检Prompt表 → 已完整定义
- ✅ 其他所有migration → 都已在schema.prisma中定义

### Q2: seed.ts是否包含所有前置信息(包括seed-quality-prompt-menus.ts)?
**答**: ✅ **是的,已完全合并**

`seed.ts` 现在包含:
- ✅ 原有的所有初始化数据(用户、角色、平台、部门等)
- ✅ `seed-quality-prompt-menus.ts` 的所有内容:
  - 智能Prompt管理菜单(父菜单)
  - 4个子菜单(全局、部门、模板、审计日志)
  - 所有相关按钮权限
  - 所有相关API权限
  - Super Admin和Department Manager的权限分配

### Q3: 对齐后是否可以删除migrations目录?
**答**: ❌ **不可以删除,必须保留**

**原因**:
1. **Prisma依赖**: Prisma使用migrations目录追踪数据库变更历史
2. **团队协作**: 其他开发者需要migration文件同步数据库
3. **生产部署**: 生产环境需要执行这些migration
4. **版本控制**: migrations是数据库schema的版本历史

**可以删除的**:
- ✅ `seed-quality-prompt-menus.ts` (已合并到seed.ts)
- ✅ `add-quality-prompt-menus.sql` (已合并到seed.ts)

### Q4: 如何对齐20260405183000_unique_approval_biz_pair/migration.sql?
**答**: ✅ **已经对齐,无需额外操作**

这个migration修改了approval_request表的索引:
```sql
DROP INDEX `approval_request_biz_type_biz_id_idx` ON `approval_request`;
CREATE UNIQUE INDEX `approval_request_biz_type_biz_id_key` ON `approval_request`(`biz_type`, `biz_id`);
```

在schema.prisma中已体现为:
```prisma
model approval_request {
  // ...
  @@unique([biz_type, biz_id])
  // ...
}
```

## 🚀 执行清理

### 方式1: 使用清理脚本(推荐)

**Windows (PowerShell)**:
```powershell
cd backend
.\prisma\cleanup-merged-files.ps1
```

**Linux/Mac (Bash)**:
```bash
cd backend
chmod +x prisma/cleanup-merged-files.sh
./prisma/cleanup-merged-files.sh
```

### 方式2: 手动删除
```bash
cd backend
rm prisma/seed-quality-prompt-menus.ts
rm prisma/migrations/add-quality-prompt-menus.sql
```

## 📝 数据库初始化流程

### 开发环境(首次或重置)
```bash
cd backend

# 方式1: 一键重置(推荐)
npx prisma migrate reset
# 这会: 删除数据库 → 重新创建 → 执行所有migration → 执行seed

# 方式2: 分步执行
npx prisma migrate deploy  # 执行所有migration
npx prisma db seed         # 执行seed数据
```

### 生产环境
```bash
cd backend
npx prisma migrate deploy  # 只执行migration,不执行seed
```

## 📂 最终文件结构

```
backend/prisma/
├── migrations/
│   ├── 20260405093000_add_approval_tables/
│   ├── 20260405160000_link_attendance_approval/
│   ├── 20260405183000_unique_approval_biz_pair/  ✅ 保留
│   ├── 20260418000000_add_quality_prompt_tables/ ✅ 保留
│   └── ... (其他migration文件)                   ✅ 保留
├── schema.prisma                                  ✅ 包含所有表定义
├── seed.ts                                        ✅ 包含所有初始化数据
├── seed-quality-prompt-menus.ts                   🗑️ 可删除(已合并)
├── add-quality-prompt-menus.sql                   🗑️ 可删除(已合并)
├── cleanup-merged-files.sh                        ✅ 清理脚本
├── cleanup-merged-files.ps1                       ✅ 清理脚本
└── DATABASE_ALIGNMENT_REPORT.md                   ✅ 详细报告
```

## ✅ 验证清单

- [x] schema.prisma包含所有migration的表结构
- [x] seed.ts包含seed-quality-prompt-menus.ts的所有内容
- [x] seed.ts处理父子菜单关系
- [x] 识别可删除的文件
- [x] 识别必须保留的文件(migrations/)
- [x] 创建清理脚本
- [x] 创建对齐报告

## 🎉 总结

### 对齐状态: ✅ 完全对齐

1. **schema.prisma** ← 包含所有表定义
2. **seed.ts** ← 包含所有初始化数据(含质检Prompt菜单)
3. **migrations/** ← 保留完整(Prisma需要)

### 下一步操作:

1. **清理已合并文件**:
   ```bash
   cd backend
   .\prisma\cleanup-merged-files.ps1  # Windows
   # 或
   ./prisma/cleanup-merged-files.sh   # Linux/Mac
   ```

2. **重新初始化数据库**:
   ```bash
   cd backend
   npx prisma migrate reset
   ```

3. **验证菜单是否正确**:
   - 登录系统
   - 检查"智能Prompt管理"菜单是否出现
   - 检查4个子菜单是否正确显示

## 📚 相关文档

- 详细报告: `backend/prisma/DATABASE_ALIGNMENT_REPORT.md`
- Spec文档: `.kiro/specs/quality-inspection-prompt-integration/`
- Prisma文档: https://www.prisma.io/docs
