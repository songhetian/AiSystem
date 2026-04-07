# AiSystem

基于两份需求文档初始化的企业级中后台基础工程。

## 技术栈

- 前端：UmiJS 4 + TypeScript + Ant Design 5 + ProComponents + Zustand + React Query v5
- 后端：NestJS + TypeScript + Prisma
- 数据层：MySQL + Redis + MinIO + Qdrant
- 权限：RBAC 五表
- 运维：Docker Compose

## 目录

- `frontend`：前端工程
- `backend`：后端工程
- `docker-compose.yml`：本地容器编排
- `.env.example`：环境变量模板

## 常用命令

- `npm run install:all`：一键安装根目录、backend 和 frontend 的所有依赖项。
- `npm run help`：输出根目录常用命令说明，包含 Docker、本地建表、Prisma Seed、SQL 导入等提示。
- `npm run docker:all`：一键构建并启动全部容器。
- `npm run db:init:sql`：通过 SQL 方式快速初始化数据库。
- `npm run prisma:seed`：默认初始化管理员账号：`admin`，密码：`Admin123456`。

## 当前阶段

当前已完成：

- 基础工程目录初始化
- 前端统一组件骨架
- 后端公共模块与认证/权限基础骨架
- Prisma 基础模型定义
- Docker Compose 基础编排
- 系统管理首批基础能力：用户、角色、菜单、接口的列表与新增骨架
- RBAC 二阶段基础能力：按钮管理、用户分配角色、角色分配菜单/按钮
- 权限生效第一层：登录返回当前用户权限、菜单树接口、前端按权限渲染菜单
- 系统管理可用性增强：用户/角色/菜单/按钮/接口支持基础编辑与逻辑删除，菜单支持树排序保存
- 系统管理高频操作：用户批量启用/禁用、重置密码、角色复制
- 三级主数据：平台、部门、店铺基础管理已就位
- 人事组织首批：部门视图、岗位管理、员工管理已就位
- 文件能力首批：MinIO 基础服务与员工身份证上传已接入

后续开发优先级：

1. 系统管理（用户、角色、菜单、按钮、接口）
2. 平台/部门/店铺基础数据
3. 人事组织
4. 考勤排班

## 当前已打通

- 登录接口入口与 JWT 骨架
- 系统管理后端接口：
  - `GET/POST /api/system/users`
  - `GET/POST /api/system/roles`
  - `GET/POST /api/system/menus`
  - `GET/POST /api/system/apis`
- 系统管理前端页面：
  - 用户管理
  - 角色管理
  - 菜单管理
  - 按钮管理
  - 接口管理
- RBAC 基础分配能力：
  - 用户分配角色
  - 角色分配菜单
  - 角色分配按钮
- 初始化能力：
  - `npm run prisma:seed`
  - 默认管理员账号：`admin`
  - 默认管理员密码：`Admin123456`
- 菜单能力：
  - 菜单树接口支持按角色回填已选菜单
  - 菜单排序接口已预留
  - 菜单管理页已支持树结构调整并保存排序
- 用户能力：
  - 支持批量启用/禁用
  - 支持重置密码
- 角色能力：
  - 支持复制角色并继承原有菜单/按钮权限
- 三级主数据能力：
  - 平台 CRUD
  - 部门 CRUD 与树结构查看
  - 店铺 CRUD
  - 作用域工具 `scope.util.ts` 已预留给后续查询层复用
- 人事组织能力：
  - 人事部门视图
  - 岗位 CRUD
  - 员工 CRUD
- 文件能力：
  - MinIO 服务基础封装
  - 员工身份证正反面上传接口
  - 员工管理页已支持上传入口
- 登录与权限：
  - `POST /api/auth/login`
  - `GET /api/auth/me`
  - `GET /api/system/menus/tree`
  - 前端侧边栏按当前用户菜单权限渲染

## 当前未完成

- 菜单树拖拽、权限分配树形勾选
- 逻辑删除、编辑、禁用、批量操作
- 其余批量操作未完成
- 平台/部门/店铺权限守卫细化
- 平台/部门/店铺查询过滤尚未全面接入业务查询
- 员工身份证上传、跨部门关联、员工角色绑定等高级能力尚未接入
- 文件访问鉴权、图片预览和统一下载链路尚未接入
- API 权限与按钮权限的完整闭环校验
- Prisma 迁移和初始化数据
