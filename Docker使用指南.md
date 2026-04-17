# Docker 使用指南

## 目录

1. [快速开始](#快速开始)
2. [环境配置](#环境配置)
3. [服务说明](#服务说明)
4. [常用命令](#常用命令)
5. [数据库管理](#数据库管理)
6. [故障排查](#故障排查)
7. [生产部署](#生产部署)

---

## 快速开始

### 首次启动（开发环境）

```bash
# 1. 切换到开发环境配置
npm run env:dev

# 2. 安装依赖
npm run install:all

# 3. 启动基础服务（MySQL、Redis、MinIO、Qdrant）
npm run docker:base

# 4. 等待服务启动完成（约 30 秒）
# 可以通过以下命令查看服务状态
npm run docker:ps

# 5. 执行数据库迁移
npm run db:migrate:deploy

# 6. 导入种子数据
npm run db:seed:local

# 7. 启动应用服务（Backend、Frontend、Nginx）
npm run docker:app

# 8. 访问系统
# 浏览器打开：http://localhost
```

### 日常开发

```bash
# 启动所有服务
npm run docker:up

# 启动应用服务（不含 Nginx，开发环境推荐）
# 前端：http://localhost:8000
# 后端：http://localhost:3000
npm run docker:app:dev

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

**开发环境说明**：

- 使用 `docker:app:dev` 不启动 Nginx，可以直接访问前后端服务
- 前端开发服务器：http://localhost:8000（支持热更新）
- 后端 API 服务：http://localhost:3000/api
- 适合本地开发调试，无需通过 Nginx 代理

---

## 环境配置

### 配置文件说明

项目提供了三个环境配置文件：

| 文件名             | 说明           | 用途                               |
| ------------------ | -------------- | ---------------------------------- |
| `.env.example`     | 配置模板       | 包含所有配置项的说明和示例         |
| `.env.development` | 开发环境配置   | 开发环境专用，密码简单，日志详细   |
| `.env.production`  | 生产环境配置   | 生产环境专用，需修改所有密码       |
| `.env`             | 当前使用的配置 | 实际生效的配置文件（不提交到 Git） |

### 切换环境

```bash
# 切换到开发环境
npm run env:dev

# 切换到生产环境
npm run env:prod

# 检查环境配置
npm run env:check
```

### 配置项说明

#### 基础配置

```env
NODE_ENV=development          # 运行环境：development / production
PORT=3000                     # 后端端口（内部）
FRONTEND_PORT=8000            # 前端端口（内部）
NGINX_PORT=80                 # Nginx 端口（对外）
```

#### 数据库配置

```env
MYSQL_PORT=3306               # MySQL 端口
MYSQL_HOST=mysql-service      # MySQL 主机（Docker 内部服务名）
MYSQL_DATABASE=aisystem       # 数据库名称
MYSQL_USER=aisystem           # 数据库用户
MYSQL_PASSWORD=aisystem123    # 数据库密码（生产环境必须修改！）
MYSQL_ROOT_PASSWORD=root123   # Root 密码（生产环境必须修改！）
```

#### Redis 配置

```env
REDIS_HOST=redis-service      # Redis 主机（Docker 内部服务名）
REDIS_PORT=6379               # Redis 端口
REDIS_PASSWORD=redis123       # Redis 密码（生产环境必须修改！）
```

#### MinIO 配置

```env
MINIO_API_PORT=9000           # MinIO API 端口
MINIO_CONSOLE_PORT=9001       # MinIO 控制台端口
MINIO_ROOT_USER=minioadmin    # MinIO 用户（生产环境必须修改！）
MINIO_ROOT_PASSWORD=minioadmin123  # MinIO 密码（生产环境必须修改！）
```

---

## 服务说明

### 服务列表

| 服务名称     | 容器名称           | 端口       | 说明                    |
| ------------ | ------------------ | ---------- | ----------------------- |
| nginx        | nginx-service      | 80         | 反向代理，统一入口      |
| backend      | backend-service    | 3000       | 后端 API 服务           |
| frontend     | frontend-service   | 8000       | 前端页面服务            |
| mysql        | mysql-service      | 3306       | MySQL 数据库            |
| redis        | redis-service      | 6379       | Redis 缓存              |
| minio        | minio-service      | 9000, 9001 | MinIO 对象存储          |
| qdrant       | qdrant-service     | 6333, 6334 | Qdrant 向量数据库       |
| mock-service | leixin-mock-server | 3888       | Mock 服务（仅开发环境） |

### 服务依赖关系

```
nginx
  ├── backend
  │   ├── mysql
  │   ├── redis
  │   └── minio
  └── frontend
      └── backend
```

### 访问地址

| 服务          | 地址                          | 说明                       |
| ------------- | ----------------------------- | -------------------------- |
| 系统首页      | http://localhost              | 通过 Nginx 访问前端        |
| 后端 API      | http://localhost/api          | 通过 Nginx 访问后端        |
| API 文档      | http://localhost/api/api-docs | Swagger 文档（仅开发环境） |
| MinIO 控制台  | http://localhost:9001         | 对象存储管理界面           |
| Prisma Studio | http://localhost:5555         | 数据库可视化工具           |

### 网络配置

所有服务使用同一个 `backend-network` 网络，可以通过服务名互相访问：

- Backend 访问 MySQL：`mysql-service:3306`
- Backend 访问 Redis：`redis-service:6379`
- Backend 访问 MinIO：`minio-service:9000`
- Nginx 访问 Backend：`backend-service:3000`
- Nginx 访问 Frontend：`frontend-service:8000`

---

## 常用命令

### Docker 容器管理

```bash
# 启动所有服务
npm run docker:up

# 停止所有服务
npm run docker:down

# 重启所有服务
npm run docker:restart

# 重新构建并启动
npm run docker:build

# 仅启动基础服务
npm run docker:base

# 仅启动应用服务（包含 Nginx）
npm run docker:app

# 仅启动应用服务（不含 Nginx，开发环境推荐）
npm run docker:app:dev

# 查看服务状态
npm run docker:ps

# 停止服务（不删除）
npm run docker:stop

# 启动已停止的服务
npm run docker:start
```

### 日志查看

```bash
# 查看所有服务日志
npm run docker:logs

# 查看后端日志
npm run docker:logs:backend

# 查看前端日志
npm run docker:logs:frontend

# 查看 MySQL 日志
npm run docker:logs:mysql

# 查看 Redis 日志
npm run docker:logs:redis

# 查看 Nginx 日志
npm run docker:logs:nginx
```

### 容器清理

```bash
# 停止并删除所有容器和数据卷（危险操作！）
npm run docker:clean

# 清理所有未使用的 Docker 资源（危险操作！）
npm run docker:prune
```

### 原生 Docker Compose 命令

```bash
# 查看服务状态
docker compose ps

# 查看服务日志
docker compose logs -f [服务名]

# 进入容器
docker compose exec [服务名] sh

# 重启单个服务
docker compose restart [服务名]

# 停止单个服务
docker compose stop [服务名]

# 启动单个服务
docker compose start [服务名]
```

---

## 数据库管理

### Prisma 迁移

```bash
# 查看迁移状态
npm run db:migrate:status

# 开发环境迁移（自动生成迁移文件）
npm run db:migrate:dev

# 生产环境迁移（仅应用现有迁移文件）
npm run db:migrate:deploy

# 重置数据库（危险操作！会删除所有数据）
npm run db:migrate:reset
```

### 数据库初始化

```bash
# 方式一：使用 Prisma（推荐）
npm run db:migrate:deploy    # 执行迁移
npm run db:seed:local         # 导入种子数据

# 方式二：使用 SQL 文件
npm run db:import:schema      # 导入表结构
npm run db:import:seed        # 导入初始化数据
npm run db:import:all         # 导入表结构和数据
```

### 数据库管理工具

```bash
# 启动 Prisma Studio（可视化数据库管理）
npm run db:studio

# 访问地址：http://localhost:5555
```

### 数据库备份与恢复

```bash
# 备份数据库
npm run db:backup

# 恢复数据库
npm run db:restore
```

### 直接连接数据库

```bash
# 进入 MySQL 容器
docker compose exec mysql sh

# 连接数据库
mysql -u aisystem -p aisystem

# 或者从宿主机连接
mysql -h 127.0.0.1 -P 3306 -u aisystem -p aisystem
```

---

## 故障排查

### 常见问题

#### 1. 端口被占用

**错误信息**：

```
Error: bind: address already in use
```

**解决方法**：

```bash
# 查看端口占用
# Windows
netstat -ano | findstr :3306

# Linux/macOS
lsof -i :3306

# 修改 .env 中的端口配置
MYSQL_PORT=3307
```

#### 2. 容器启动失败

**解决方法**：

```bash
# 查看容器日志
npm run docker:logs:[服务名]

# 重新构建容器
npm run docker:build

# 清理并重新启动
npm run docker:clean
npm run docker:up
```

#### 3. 数据库连接失败

**错误信息**：

```
Error: Can't reach database server
```

**解决方法**：

```bash
# 1. 检查 MySQL 是否启动
npm run docker:ps

# 2. 查看 MySQL 日志
npm run docker:logs:mysql

# 3. 等待 MySQL 初始化完成（首次启动需要约 30 秒）

# 4. 检查数据库配置
npm run env:check
```

#### 4. 前端无法访问后端

**解决方法**：

```bash
# 1. 检查 Nginx 配置
cat infra/nginx/default.conf

# 2. 检查后端是否启动
npm run docker:logs:backend

# 3. 检查网络连接
docker compose exec nginx ping backend-service
```

#### 5. 数据卷权限问题

**错误信息**：

```
Permission denied
```

**解决方法**：

```bash
# Linux/macOS
sudo chown -R $USER:$USER ./backend/storage
sudo chmod -R 755 ./backend/storage

# Windows
# 右键文件夹 -> 属性 -> 安全 -> 编辑权限
```

### 调试技巧

#### 进入容器调试

```bash
# 进入后端容器
docker compose exec backend sh

# 进入 MySQL 容器
docker compose exec mysql sh

# 进入 Nginx 容器
docker compose exec nginx sh
```

#### 查看容器资源使用

```bash
# 查看所有容器资源使用情况
docker stats

# 查看单个容器资源使用
docker stats backend-service
```

#### 查看网络连接

```bash
# 查看网络列表
docker network ls

# 查看网络详情
docker network inspect aisystem_backend-network
```

---

## 生产部署

### 部署前检查清单

- [ ] 切换到生产环境配置：`npm run env:prod`
- [ ] 修改 `.env` 中所有包含 `changeme` 的密码
- [ ] 设置强密码（至少 16 位，包含大小写字母、数字、特殊字符）
- [ ] 配置 `CORS_ORIGINS` 为实际域名
- [ ] 启用 `CSRF_ENABLED` 和 `RATE_LIMIT_ENABLED`
- [ ] 关闭 `API_DOCS_ENABLED` 和 `DEBUG_MODE`
- [ ] 配置邮件和短信服务
- [ ] 配置 SSL 证书（如使用 HTTPS）
- [ ] 设置 `.env` 文件权限：`chmod 600 .env`
- [ ] 备份 `.env` 文件到安全位置
- [ ] 配置防火墙规则
- [ ] 配置数据库备份策略
- [ ] 配置日志监控和告警

### 生产部署步骤

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

### HTTPS 配置

#### 1. 准备 SSL 证书

```bash
# 创建证书目录
mkdir -p infra/nginx/ssl

# 将证书文件放到该目录
# cert.pem - 证书文件
# key.pem - 私钥文件
```

#### 2. 修改 Nginx 配置

编辑 `infra/nginx/default.conf`，取消 HTTPS 配置的注释。

#### 3. 修改 Docker 配置

编辑 `.env`：

```env
NGINX_PORT=443
```

#### 4. 重启服务

```bash
npm run docker:restart
```

### 性能优化

#### 1. 数据库连接池

编辑 `.env`：

```env
DATABASE_URL=mysql://user:pass@host:3306/db?connection_limit=100&pool_timeout=30
```

#### 2. Redis 持久化

编辑 `infra/redis/redis.conf`：

```conf
save 900 1
save 300 10
save 60 10000
```

#### 3. Nginx 缓存

编辑 `infra/nginx/default.conf`，添加缓存配置。

### 监控和日志

#### 1. 日志收集

```bash
# 查看日志
npm run docker:logs

# 导出日志
docker compose logs > logs.txt
```

#### 2. 资源监控

```bash
# 查看资源使用
docker stats
```

#### 3. 健康检查

```bash
# 检查服务健康状态
docker compose ps
```

---

## 附录

### 环境变量完整列表

详见 `.env.example` 文件。

### 常用端口列表

| 端口 | 服务     | 说明                 |
| ---- | -------- | -------------------- |
| 80   | Nginx    | HTTP 入口            |
| 443  | Nginx    | HTTPS 入口（需配置） |
| 3000 | Backend  | 后端 API（内部）     |
| 8000 | Frontend | 前端页面（内部）     |
| 3306 | MySQL    | 数据库               |
| 6379 | Redis    | 缓存                 |
| 9000 | MinIO    | 对象存储 API         |
| 9001 | MinIO    | 对象存储控制台       |
| 6333 | Qdrant   | 向量数据库 HTTP      |
| 6334 | Qdrant   | 向量数据库 gRPC      |
| 3888 | Mock     | Mock 服务（仅开发）  |
| 5555 | Prisma   | Prisma Studio        |

### 相关文档

- [环境变量配置说明](./环境变量配置说明.md)
- [数据库迁移指南](./数据迁移指南.md)
- [开发文档](./开发文档.md)
- [README](./README.md)

---

**最后更新时间**：2026-04-16
