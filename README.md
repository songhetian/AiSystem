# 雷犀 AI 客服系统

## 快速开始

### 0. 启动 Docker Desktop

**重要**：在运行任何命令之前，请确保 Docker Desktop 已启动并完全就绪。

```bash
# 检查 Docker 是否就绪
docker ps

# 如果看到类似错误：
# "failed to connect to the docker API"
# 说明 Docker Desktop 还在启动中，请等待 30-60 秒后重试
```

### 1. 构建前端 Docker 镜像（首次运行必须）

**重要**：在首次启动开发环境之前，需要先构建前端 Docker 镜像。

```bash
# 进入前端目录
cd frontend

# 构建前端镜像
docker build -t aisystem-frontend-v8:latest .

# 返回根目录
cd ..
```

**说明**：
- 前端服务使用预构建的 Docker 镜像 `aisystem-frontend-v8:latest`
- 首次运行或前端代码有重大更新时需要重新构建镜像
- 构建过程可能需要 5-10 分钟，请耐心等待

### 2. 启动开发环境

```bash
# 启动所有服务（MySQL、Redis、MinIO、Qdrant、Mock、前端、后端）
npm run dev

# 或者只启动基础服务（MySQL、Redis、MinIO、Qdrant）
npm run dev:base

# 查看服务状态
npm run ps

# 查看日志
npm run logs
```

### 3. 访问应用

- 前端：http://localhost:8000
- 后端 API：http://localhost:3000
- API 文档：http://localhost:3000/api-docs
- MinIO 控制台：http://localhost:9001

### 4. 停止服务

```bash
npm run stop
```

## 常用命令

```bash
# 安装依赖
npm run install:all

# Docker 镜像管理
cd frontend && docker build -t aisystem-frontend-v8:latest .  # 构建前端镜像
cd backend && docker build -t aisystem-backend:latest .       # 构建后端镜像（可选）

# 启动开发环境
npm run dev              # 启动所有服务（包括 Mock）
npm run dev:base         # 只启动基础服务
npm run dev:mock         # 启动 Mock 服务

# 生产环境
npm run prod             # 启动生产环境

# 服务管理
npm run stop             # 停止所有服务
npm run restart          # 重启服务
npm run ps               # 查看服务状态

# 日志查看
npm run logs             # 所有服务日志
npm run logs:backend     # 后端日志
npm run logs:frontend    # 前端日志
npm run logs:mock        # Mock 服务日志

# 数据库管理
npm run db:migrate       # 运行数据库迁移
npm run db:sync          # 同步数据库结构
npm run db:seed          # 填充种子数据
npm run db:studio        # 打开 Prisma Studio
```

## 服务端口

| 服务      | 端口  | 说明           |
|-----------|-------|----------------|
| 前端      | 8000  | React/Umi      |
| 后端      | 3000  | NestJS API     |
| MySQL     | 3307  | 数据库         |
| Redis     | 6379  | 缓存           |
| MinIO API | 9000  | 对象存储       |
| MinIO UI  | 9001  | 管理控制台     |
| Qdrant    | 6333  | 向量数据库     |
| Mock      | 3888  | 模拟服务       |

## 环境配置

配置文件：`.env`

```env
# 数据库
DATABASE_URL=mysql://aisystem:aisystem123@127.0.0.1:3307/aisystem

# Redis
REDIS_HOST=127.0.0.1
REDIS_PORT=6379

# 前端 API
VITE_API_BASE_URL=http://localhost:3000/api/v1
```

## 故障排查

### 1. 前端镜像不存在

**错误信息**：
```
Error response from daemon: pull access denied for aisystem-frontend-v8, repository does not exist
或
no such image: aisystem-frontend-v8:latest
```

**解决方法**：
需要先构建前端 Docker 镜像：
```bash
cd frontend
docker build -t aisystem-frontend-v8:latest .
cd ..
```

### 2. Docker 未启动或未就绪

**错误信息**：
```
failed to connect to the docker API at npipe:////./pipe/dockerDesktopLinuxEngine
```

**解决方法**：
1. 打开 Docker Desktop 应用程序
2. 等待 Docker 引擎完全启动（30-60 秒）
3. 检查 Docker 是否就绪：
   ```bash
   docker ps
   ```
4. 看到容器列表（即使是空的）说明 Docker 已就绪

### 3. 端口被占用
```bash
# Windows
Get-NetTCPConnection -LocalPort 3000

# Linux/Mac
lsof -i :3000
```

### 查看容器日志
```bash
npm run logs
```

## 技术栈

- **前端**：React 18 + Umi 4 + Ant Design 5
- **后端**：NestJS + Prisma + MySQL
- **缓存**：Redis
- **存储**：MinIO
- **向量数据库**：Qdrant
- **容器化**：Docker + Docker Compose
