# 雷犀系统核心开发与技术质量规范 (system-standard)

## 1. 视觉与交互风格 (Strict AD Pro 5)
- **UI 框架**：严格执行 Ant Design Pro 5.x 视觉标准。
- **组件复用**：禁止编写重复的业务组件。必须 100% 复用 `frontend/src/components/` 下的 `BaseTable`, `BaseForm`, `BaseModal`, `ActionGroup`, `BaseUpload` 等标准组件。
- **页面布局**：
  - 搜索筛选区：必须单行全铺满，利用 `flex-grow` 自适应比例。
  - 快捷日期组：物理缝合（高度 44px），边框颜色固定为 `slate-500` (#64748b)，实现点击即时联动。
  - 字体视觉：严禁使用 `slate-400` 或 `gray-400` 以下的浅色。主要文字必须 `slate-900` 或纯黑并加粗；次要文字提升至 `slate-500/600`。
- **复杂度优化**：当同级设置或分组超过 3 个时，必须使用 Tab 标签页进行物理隔离以降低视觉负载。

## 2. 数据库与数据同步 (Triple-Sync Protocol)
- **架构同步**：任何字段或表的变动，必须**同时**修改以下两个文件：
  1. `backend/prisma/schema.prisma` (ORM 模型定义)
  2. 根目录 `schema.sql` (原生 MySQL 结构定义，保持 DDL 注释完整)
- **权限同步**：新增功能、菜单或接口时，必须在以下两处同步增加对应的权限数据：
  1. `seed.sql`：使用 `INSERT INTO ... ON DUPLICATE KEY UPDATE` 语句确保幂等执行。
  2. `backend/prisma/seed.ts`：确保通过 Prisma Seed 也能初始化完整的权限树。
- **命名规范**：数据库字段一律使用小写下划线 (`snake_case`)，且必须包含基础 4 字段：`id` (varchar(191)), `create_time`, `update_time`, `is_deleted` (int default 0)。

## 3. 权限与安全标准 (Permission-First)
- **按钮权限**：所有操作按钮必须包裹在 `Permission` 组件内，且 `button_code` 必须与 `seed.sql` 中的定义严格匹配。
- **后端拦截**：所有 Controller 必须使用 `@Permission()` 装饰器进行接口级权限校验。
- **数据权限**：业务查询必须注入 `CurrentUser` 以实现基于平台/部门/店铺的数据隔离。

## 4. 技术质量与 TS 零错误 (Zero TS Errors Policy)
- **TS 编译检查**：在任务“验证 (Validate)”阶段，必须运行 `npm run tsc` 或 `npx tsc` 检查。
- **严禁规避**：严禁使用 `any`（除非必须操作未知第三方库并提供显式类型转换）、`@ts-ignore` 或 `as any`。
- **ESLint 联动**：遵循 `eslint.config.mjs`。如果发现 TS 错误未在编辑器内标红，必须检查并配置 `vscode` 或 `eslint` 规则，确保所有 TS 类型不匹配在开发期即刻报错。
- **DTO 完整性**：所有接口请求和响应必须有明确的 DTO 类型定义，禁止在 Controller 中直接传递 `any` 对象。

## 5. 任务闭环流程 (Plan-Act-Validate)
1. **Plan**：确认数据库变更、权限 Code 定义及 UI 布局草图。
2. **Act**：
   - 更新 Prisma Schema -> 生成 Client。
   - 更新 `schema.sql` & `seed.sql`。
   - 编写后端 DTO/Service/Controller（含权限校验）。
   - 编写前端标准组件页面（遵循 AD Pro 5）。
3. **Validate**：
   - 运行 `npx tsc` 确认无类型错误。
   - 确认权限 Code 在数据库中已正确插入并可生效。
   - 确认 UI 字体及布局符合“雷犀系统”加深加粗标准。
