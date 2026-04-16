# 雷犀 AI 客服系统

企业级智能客服管理系统，基于现代化技术栈构建的中后台管理平台。

## ✨ 特性

- 🚀 **现代化技术栈**：基于 NestJS + React + TypeScript 构建
- 🔐 **完善的权限系统**：RBAC 权限模型，支持菜单、按钮、接口级权限控制
- 📦 **微服务架构**：Docker Compose 容器化部署，服务解耦
- 🎨 **优雅的 UI**：基于 Ant Design 5 + ProComponents 构建
- 🔥 **高可用设计**：防抖、限流、熔断、降级、缓存等高可用机制
- 📊 **数据可视化**：支持数据大屏、报表分析
- 🤖 **AI 能力**：集成向量数据库，支持智能问答、知识库管理
- 📱 **响应式设计**：支持 PC、平板、移动端访问

## 🛠️ 技术栈

### 前端

- **框架**：UmiJS 4 + React 18 + TypeScript
- **UI 组件**：Ant Design 5 + ProComponents
- **状态管理**：Zustand
- **数据请求**：React Query v5 + Axios
- **构建工具**：Webpack 5

### 后端

- **框架**：NestJS + TypeScript
- **ORM**：Prisma
- **认证**：JWT + Passport
- **验证**：class-validator + class-transformer
- **文档**：Swagger/OpenAPI

### 数据层

- **关系数据库**：MySQL 8.0
- **缓存**：Redis 7.2
- **对象存储**：MinIO
- **向量数据库**：Qdrant

### 运维

- **容器化**：Docker + Docker Compose
- **反向代理**：Nginx
- **日志**：Winston + 文件日志
- **监控**：性能监控 + 慢查询监控

## 📁 项目结构

```
.
├── frontend/              # 前端项目
│   ├── src/
│   │   ├── pages/        # 页面组件
│   │   ├── components/   # 公共组件
│   │   ├── api/          # API 接口
│   │   ├── models/       # 状态管理
│   │   └── utils/        # 工具函数
│   └── package.json
├── backend/              # 后端项目
│   ├── src/
│   │   ├── modules/      # 业务模块
│   │   ├── common/       # 公共模块
│   │   └── prisma/       # Prisma 配置
│   ├── prisma/           # 数据库模型
│   └── package.json
├── infra/                # 基础设施配置
│   ├── nginx/           # Nginx 配置
│   ├── mysql/           # MySQL 配置
│   └── redis/           # Redis 配置
├── scripts/              # 脚本工具
├── .env.development      # 开发环境配置
├── .env.production       # 生产环境配置
├── docker-compose.yml    # Docker 编排
└── package.json          # 根目录脚本
```

## 🚀 快速开始

### 环境要求

- Node.js >= 18.0.0
- Docker >= 20.10.0
- Docker Compose >= 2.0.0
- npm >= 9.0.0

### 首次启动（开发环境）

```bash
# 1. 克隆项目
git clone <repository-url>
cd aisystem

# 2. 切换到开发环境配置
npm run env:dev

# 3. 安装依赖
npm run install:all

# 4. 启动基础服务（MySQL、Redis、MinIO、Qdrant）
npm run docker:base

# 5. 等待服务启动完成（约 30 秒）
npm run docker:ps

# 6. 执行数据库迁移
npm run db:migrate:deploy

# 7. 导入种子数据
npm run db:seed:local

# 8. 启动应用服务（Backend、Frontend、Nginx）
npm run docker:app

# 9. 访问系统
# 浏览器打开：http://localhost
# 默认账号：admin
# 默认密码：Admin123456
```

### 日常开发

```bash
# 启动所有服务
npm run docker:up

# 查看服务状态
npm run docker:ps

# 查看后端日志
npm run docker:logs:backend

# 查看前端日志
npm run docker:logs:frontend

# 重启服务
npm run docker:restart

# 停止服务
npm run docker:down
```

## 📝 常用命令

### Docker 管理

| 命令                           | 说明                                       |
| ------------------------------ | ------------------------------------------ |
| `npm run docker:up`            | 启动所有服务                               |
| `npm run docker:down`          | 停止所有服务                               |
| `npm run docker:restart`       | 重启所有服务                               |
| `npm run docker:build`         | 重新构建并启动                             |
| `npm run docker:base`          | 仅启动基础服务                             |
| `npm run docker:app`           | 仅启动应用服务（含 Nginx）                 |
| `npm run docker:app:dev`       | 仅启动应用服务（不含 Nginx，开发环境推荐） |
| `npm run docker:ps`            | 查看服务状态                               |
| `npm run docker:logs`          | 查看所有日志                               |
| `npm run docker:logs:backend`  | 查看后端日志                               |
| `npm run docker:logs:frontend` | 查看前端日志                               |

### 数据库管理

| 命令                        | 说明               |
| --------------------------- | ------------------ |
| `npm run db:migrate:deploy` | 执行数据库迁移     |
| `npm run db:migrate:status` | 查看迁移状态       |
| `npm run db:seed:local`     | 导入种子数据       |
| `npm run db:studio`         | 启动 Prisma Studio |
| `npm run db:backup`         | 备份数据库         |
| `npm run db:restore`        | 恢复数据库         |

### 环境管理

| 命令                | 说明           |
| ------------------- | -------------- |
| `npm run env:dev`   | 切换到开发环境 |
| `npm run env:prod`  | 切换到生产环境 |
| `npm run env:check` | 检查环境配置   |

### 构建命令

| 命令                     | 说明         |
| ------------------------ | ------------ |
| `npm run backend:build`  | 构建后端项目 |
| `npm run frontend:build` | 构建前端项目 |
| `npm run install:all`    | 安装所有依赖 |

## 🌐 访问地址

| 服务          | 地址                          | 说明                       |
| ------------- | ----------------------------- | -------------------------- |
| 系统首页      | http://localhost              | 前端页面                   |
| 后端 API      | http://localhost/api          | 后端接口                   |
| API 文档      | http://localhost/api/api-docs | Swagger 文档（仅开发环境） |
| MinIO 控制台  | http://localhost:9001         | 对象存储管理               |
| Prisma Studio | http://localhost:5555         | 数据库可视化工具           |

## 📊 端口说明

| 端口 | 服务     | 说明                    |
| ---- | -------- | ----------------------- |
| 80   | Nginx    | 统一入口（HTTP）        |
| 3000 | Backend  | 后端 API（内部端口）    |
| 8000 | Frontend | 前端页面（内部端口）    |
| 3306 | MySQL    | 数据库                  |
| 6379 | Redis    | 缓存                    |
| 9000 | MinIO    | 对象存储 API            |
| 9001 | MinIO    | 对象存储控制台          |
| 6333 | Qdrant   | 向量数据库 HTTP         |
| 6334 | Qdrant   | 向量数据库 gRPC         |
| 3888 | Mock     | Mock 服务（仅开发环境） |

## 🔧 配置说明

### 环境配置文件

- `.env.development` - 开发环境配置（密码简单，日志详细）
- `.env.production` - 生产环境配置（需修改所有密码）
- `.env` - 当前使用的配置（不提交到 Git）

### 配置项说明

详见 [环境变量配置说明](./环境变量配置说明.md)

## 📚 文档

- [Docker 使用指南](./Docker使用指南.md) - Docker 容器管理详细说明
- [环境变量配置说明](./环境变量配置说明.md) - 环境变量配置详解
- [数据迁移指南](./数据迁移指南.md) - 数据库迁移和初始化
- [开发文档](./开发文档.md) - 开发规范和最佳实践
- [注册功能实现总结](./注册功能实现完成总结.md) - 注册功能实现说明

## 🎯 功能模块

## 🎯 功能模块

### ✅ 已完成

#### 系统管理

- ✅ 用户管理（CRUD、批量启用/禁用、重置密码）
- ✅ 角色管理（CRUD、角色复制、权限分配）
- ✅ 菜单管理（CRUD、树结构、排序）
- ✅ 按钮管理（CRUD、权限控制）
- ✅ 接口管理（CRUD、API 权限）
- ✅ 用户注册（图形验证码、审核流程）

#### 权限系统

- ✅ RBAC 权限模型（用户、角色、菜单、按钮、接口）
- ✅ 用户分配角色
- ✅ 角色分配菜单
- ✅ 角色分配按钮
- ✅ 菜单权限控制
- ✅ 按钮权限控制
- ✅ 接口权限控制

#### 组织架构

- ✅ 平台管理（CRUD）
- ✅ 部门管理（CRUD、树结构）
- ✅ 店铺管理（CRUD）
- ✅ 岗位管理（CRUD）
- ✅ 员工管理（CRUD、身份证上传）

#### 认证授权

- ✅ 用户登录（JWT）
- ✅ 用户注册（图形验证码）
- ✅ 注册审核（管理员审核）
- ✅ 权限验证（菜单、按钮、接口）
- ✅ 登录失败锁定

#### 文件管理

- ✅ MinIO 对象存储
- ✅ 文件上传（支持图片、文档）
- ✅ 员工身份证上传

#### 高可用优化

- ✅ 防抖保护（@AntiShake）
- ✅ 幂等控制（@Idempotent）
- ✅ 限流保护（@RateLimit）
- ✅ 缓存优化（@Cache）
- ✅ 缓存清除（@CacheEvict）
- ✅ 查询监控（@QueryOptimize）
- ✅ 熔断降级（@CircuitBreaker）
- ✅ 并发控制（@ConcurrentControl）
- ✅ 分布式锁（@DistributedLock）

### 🚧 进行中

#### 考勤管理

- 🚧 考勤记录
- 🚧 考勤审批
- 🚧 考勤统计

#### 排班管理

- 🚧 排班计划
- 🚧 排班规则
- 🚧 排班调整

#### 财务管理

- 🚧 报销管理
- 🚧 审批流程
- 🚧 财务统计

### 📋 待开发

#### 知识库管理

- ⏳ 知识分类
- ⏳ 知识文档
- ⏳ 智能问答
- ⏳ 向量搜索

#### 商品管理

- ⏳ 商品分类
- ⏳ 商品信息
- ⏳ 库存管理

#### 数据大屏

- ⏳ 实时数据展示
- ⏳ 图表可视化
- ⏳ 数据分析

#### 消息通知

- ⏳ 系统消息
- ⏳ 邮件通知
- ⏳ 短信通知

## 🔐 默认账号

### 管理员账号

- **账号**：admin
- **密码**：Admin123456
- **权限**：超级管理员，拥有所有权限

### 测试账号

执行 `npm run db:seed:local` 后会自动创建测试账号，详见种子数据脚本。

## 🚀 生产部署

### 部署前检查

- [ ] 切换到生产环境配置：`npm run env:prod`
- [ ] 修改 `.env` 中所有包含 `changeme` 的密码
- [ ] 配置 `CORS_ORIGINS` 为实际域名
- [ ] 启用 `CSRF_ENABLED` 和 `RATE_LIMIT_ENABLED`
- [ ] 关闭 `API_DOCS_ENABLED` 和 `DEBUG_MODE`
- [ ] 配置邮件和短信服务
- [ ] 配置 SSL 证书（如使用 HTTPS）
- [ ] 设置 `.env` 文件权限：`chmod 600 .env`
- [ ] 配置防火墙规则
- [ ] 配置数据库备份策略

### 部署步骤

```bash
# 1. 切换到生产配置
npm run env:prod

# 2. 修改 .env 中的所有密码
vim .env

# 3. 设置文件权限
chmod 600 .env

# 4. 构建并启动服务
npm run docker:build

# 5. 执行数据库迁移
npm run db:migrate:deploy

# 6. 导入种子数据
npm run db:seed:local

# 7. 检查服务状态
npm run docker:ps

# 8. 查看日志
npm run docker:logs

# 9. 备份数据库
npm run db:backup
```

详见 [Docker 使用指南](./Docker使用指南.md)

## 🐛 故障排查

### 常见问题

#### 端口被占用

```bash
# 查看端口占用
netstat -ano | findstr :3306  # Windows
lsof -i :3306                 # Linux/macOS

# 修改 .env 中的端口配置
MYSQL_PORT=3307
```

#### 容器启动失败

```bash
# 查看容器日志
npm run docker:logs:[服务名]

# 重新构建容器
npm run docker:build

# 清理并重新启动
npm run docker:clean
npm run docker:up
```

#### 数据库连接失败

```bash
# 检查 MySQL 是否启动
npm run docker:ps

# 查看 MySQL 日志
npm run docker:logs:mysql

# 等待 MySQL 初始化完成（首次启动需要约 30 秒）
```

更多问题请查看 [Docker 使用指南](./Docker使用指南.md)

## 📖 开发规范

### 代码规范

- 使用 TypeScript 严格模式
- 遵循 ESLint 规则
- 使用 Prettier 格式化代码
- 编写单元测试

### Git 提交规范

```
feat: 新功能
fix: 修复 bug
docs: 文档更新
style: 代码格式调整
refactor: 代码重构
test: 测试相关
chore: 构建/工具链相关
```

### 分支管理

- `main` - 主分支，生产环境代码
- `develop` - 开发分支
- `feature/*` - 功能分支
- `hotfix/*` - 紧急修复分支

## 🤝 贡献指南

1. Fork 本仓库
2. 创建特性分支 (`git checkout -b feature/AmazingFeature`)
3. 提交更改 (`git commit -m 'feat: Add some AmazingFeature'`)
4. 推送到分支 (`git push origin feature/AmazingFeature`)
5. 提交 Pull Request

## 📄 许可证

本项目采用 UNLICENSED 许可证。

## 👥 团队

**雷犀科技**

## 📞 联系方式

如有问题或建议，请联系：

- 邮箱：support@example.com
- 官网：https://www.example.com

---

**最后更新时间**：2026-04-16
