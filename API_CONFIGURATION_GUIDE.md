# API 配置指南 - 简化版本

## 概述

根据用户反馈，我们已经简化了前端 API 配置方式，移除了复杂的代理配置，改为直接使用环境变量 `VITE_API_BASE_URL`。

## 配置方式

### 1. 环境变量配置

在相应的 `.env` 文件中设置 `VITE_API_BASE_URL`：

```bash
# 本地开发
VITE_API_BASE_URL=http://localhost:3000/api/v1

# 不同端口
VITE_API_BASE_URL=http://localhost:4000/api/v1

# 外部服务器
VITE_API_BASE_URL=https://api.example.com/api/v1

# Docker 环境（容器内访问）
VITE_API_BASE_URL=http://backend-service:3000/api/v1
```

### 2. 前端代码

前端 `src/utils/request.ts` 会自动读取环境变量：

```typescript
const instance = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || "/api/v1",
  // ...其他配置
});
```

## 优势

### ✅ 简单灵活
- 只需修改一个环境变量
- 支持任意后端地址和端口
- 无需修改代理配置

### ✅ 易于部署
- 本地开发：`http://localhost:3000/api/v1`
- 测试环境：`http://test-api.example.com/api/v1`
- 生产环境：`https://api.example.com/api/v1`

### ✅ 支持多种场景
- 本地后端服务
- Docker 容器化部署
- 外部 API 服务器
- 不同端口配置

## 配置文件

所有环境配置文件都已更新：

- `.env` - 当前使用的配置
- `.env.development` - 开发环境模板
- `.env.production` - 生产环境模板
- `.env.example` - 配置示例

## 迁移说明

从复杂代理配置迁移到简化配置：

1. ~~删除 `frontend/.umirc.ts` 中的 `proxy` 配置~~ ✅ 已完成
2. ~~确保环境变量 `VITE_API_BASE_URL` 正确配置~~ ✅ 已完成
3. ~~前端代码使用 `import.meta.env.VITE_API_BASE_URL`~~ ✅ 已完成

## 常见配置示例

```bash
# 场景1：本地开发，后端运行在 3000 端口
VITE_API_BASE_URL=http://localhost:3000/api/v1

# 场景2：本地开发，后端运行在 4000 端口
VITE_API_BASE_URL=http://localhost:4000/api/v1

# 场景3：使用外部测试服务器
VITE_API_BASE_URL=https://test-api.company.com/api/v1

# 场景4：使用外部生产服务器
VITE_API_BASE_URL=https://api.company.com/api/v1

# 场景5：Docker 环境，容器间通信
VITE_API_BASE_URL=http://backend-service:3000/api/v1
```

现在配置更加简单和灵活！🎉
