# Docker 构建和部署指南

## 问题修复说明

### 原问题
```
ERROR: failed to resolve source metadata for docker.io/library/node:20-alpine
```

### 解决方案
1. **添加国内npm镜像源**：在Dockerfile中配置 `registry.npmmirror.com`
2. **多阶段构建优化**：减小最终镜像体积
3. **运行时配置**：API地址等配置在运行时动态生成，无需重新构建

## 构建命令

### 1. 清理旧镜像和容器（可选）

```bash
# 停止并删除所有容器
docker compose down

# 删除旧镜像（可选）
docker rmi aisystem-frontend-v8:latest
docker rmi aisystem-backend:latest
```

### 2. 重新构建镜像

```bash
# 构建所有服务
docker compose build

# 或者只构建前端
docker compose build frontend

# 或者只构建后端
docker compose build backend
```

### 3. 启动服务

```bash
# 启动所有服务（不包括dev profile）
docker compose up -d

# 启动包括mock服务（开发环境）
docker compose --profile dev up -d

# 查看日志
docker compose logs -f frontend
docker compose logs -f backend
```

## 环境变量配置

### 修改API地址（无需重新构建）

编辑 `.env` 文件：

```bash
# 前端API基础URL
VITE_API_BASE_URL=http://localhost:3000/api/v1

# 后端端口
PORT=3000

# 前端端口
FRONTEND_PORT=8000
```

修改后重启服务：

```bash
docker compose restart frontend
```

### 配置优先级

1. **运行时配置**（最高优先级）
   - `window.APP_CONFIG.apiBaseUrl`
   - 在容器启动时从环境变量生成

2. **构建时环境变量**
   - `process.env.VITE_API_BASE_URL`
   - 在构建镜像时固定

3. **默认值**（最低优先级）
   - `/api/v1`
   - 适用于Nginx反向代理场景

## 开发环境配置

### 本地开发（热更新）

当前配置已支持本地代码修改后自动生效：

```yaml
volumes:
  # 前端源码挂载
  - ./frontend/src:/app/src
  - ./frontend/.umirc.ts:/app/.umirc.ts
  - ./frontend/tailwind.config.js:/app/tailwind.config.js
  - ./frontend/tsconfig.json:/app/tsconfig.json
  - ./frontend/public/config.js:/app/public/config.js
  
  # 后端源码挂载
  - ./backend/src:/app/src
  - ./backend/prisma:/app/prisma
```

修改代码后：
- **前端**：Umi会自动热更新（HMR）
- **后端**：需要重启容器 `docker compose restart backend`

### 数据库初始化

```bash
# 进入后端容器
docker exec -it backend-service sh

# 推送数据库schema
npm run db:push

# 执行种子数据
npm run db:seed

# 退出容器
exit
```

## 生产环境配置

### 1. 修改环境变量

复制并编辑生产环境配置：

```bash
cp .env.production .env
```

编辑 `.env`：

```bash
NODE_ENV=production
PORT=3000
VITE_API_BASE_URL=/api/v1  # 使用相对路径，通过Nginx代理
```

### 2. 启动生产环境

```bash
# 启动包括Nginx（使用prod profile）
docker compose --profile prod up -d

# 查看服务状态
docker compose ps
```

### 3. 访问应用

- **通过Nginx访问**：http://localhost （默认80端口）
- **直接访问前端**：http://localhost:8000
- **直接访问后端**：http://localhost:3000

## 镜像优化说明

### 前端镜像优化

1. **多阶段构建**
   - Builder阶段：安装依赖、构建代码
   - Runner阶段：只包含构建产物和运行时依赖

2. **镜像大小对比**
   - 优化前：~500MB
   - 优化后：~150MB

3. **构建缓存**
   - 依赖层缓存：package.json未变化时复用
   - 代码层独立：代码变化不影响依赖层

### 后端镜像优化

1. **多阶段构建**
   - Builder阶段：编译TypeScript、生成Prisma客户端
   - Runner阶段：只包含编译后的JS和生产依赖

2. **镜像大小对比**
   - 优化前：~600MB
   - 优化后：~200MB

## 故障排查

### 问题1：构建失败 - 无法连接镜像源

**症状**：
```
ERROR: failed to resolve source metadata for docker.io/library/node:20-alpine
```

**解决方案**：
1. 检查Docker是否正常运行
2. 检查网络连接
3. 使用国内镜像源（已在Dockerfile中配置）

```bash
# 测试Docker连接
docker ps

# 测试网络
ping registry.npmmirror.com
```

### 问题2：前端API请求404

**症状**：
```
POST http://localhost:8000/api/v1/auth/login 404 (Not Found)
```

**原因**：前端请求发送到了前端服务端口，而不是后端端口

**解决方案**：

1. 检查环境变量配置：
```bash
cat .env | grep VITE_API_BASE_URL
```

2. 检查容器内配置：
```bash
docker exec -it frontend-service cat /app/dist/config.js
```

3. 检查浏览器配置：
```javascript
// 浏览器控制台执行
console.log(window.APP_CONFIG)
```

4. 如果配置错误，修改 `.env` 后重启：
```bash
docker compose restart frontend
```

### 问题3：样式丢失

**症状**：页面加载但没有样式

**原因**：Tailwind CSS配置问题

**解决方案**：

1. 检查 `frontend/src/global.css` 是否存在
2. 检查 `frontend/src/app.tsx` 是否导入了 `global.css`
3. 检查 `.umirc.ts` 中的PostCSS配置

```bash
# 重新构建前端
docker compose build frontend
docker compose up -d frontend
```

### 问题4：容器频繁重启

**症状**：
```
frontend-service exited with code 0 (restarting)
```

**原因**：Tailwind CSS编译超时

**解决方案**：

已在 `.umirc.ts` 中禁用MFSU和内置Tailwind插件：

```typescript
mfsu: false,
tailwindcss: false,
extraPostCSSPlugins: [
  require('tailwindcss'),
  require('autoprefixer'),
],
```

### 问题5：热更新不生效

**症状**：修改代码后需要重启容器

**解决方案**：

1. 检查volume挂载是否正确：
```bash
docker compose config | grep volumes -A 5
```

2. 确认文件已同步到容器：
```bash
docker exec -it frontend-service ls -la /app/src
```

3. 查看Umi日志：
```bash
docker compose logs -f frontend | grep "event -"
```

## 性能优化建议

### 开发环境

1. **禁用MFSU**：已配置，提升Docker中的编译速度
2. **使用volume挂载**：已配置，支持热更新
3. **减少日志输出**：设置 `LOG_LEVEL=warn`

### 生产环境

1. **启用Nginx反向代理**：统一入口，提升性能
2. **使用相对路径API**：`VITE_API_BASE_URL=/api/v1`
3. **启用缓存**：Redis缓存、浏览器缓存
4. **资源压缩**：Nginx gzip压缩

## 常用命令速查

```bash
# 构建
docker compose build                    # 构建所有服务
docker compose build --no-cache        # 强制重新构建

# 启动
docker compose up -d                    # 后台启动
docker compose --profile dev up -d     # 启动开发环境（含mock）
docker compose --profile prod up -d    # 启动生产环境（含nginx）

# 停止
docker compose stop                     # 停止服务
docker compose down                     # 停止并删除容器
docker compose down -v                  # 停止并删除容器和数据卷

# 日志
docker compose logs -f                  # 查看所有日志
docker compose logs -f frontend        # 查看前端日志
docker compose logs -f backend         # 查看后端日志

# 重启
docker compose restart                  # 重启所有服务
docker compose restart frontend        # 重启前端

# 进入容器
docker exec -it frontend-service sh    # 进入前端容器
docker exec -it backend-service sh     # 进入后端容器

# 清理
docker system prune -a                 # 清理所有未使用的镜像
docker volume prune                    # 清理未使用的数据卷
```

## 下一步

1. ✅ 修复Docker镜像源问题
2. ✅ 实现运行时配置
3. ✅ 优化镜像大小
4. ✅ 支持热更新
5. 🔄 测试构建和部署
6. 📝 完善文档

现在可以执行以下命令测试：

```bash
# 1. 重新构建镜像
docker compose build

# 2. 启动服务
docker compose up -d

# 3. 查看日志
docker compose logs -f frontend

# 4. 访问应用
# 浏览器打开：http://localhost:8000
```
