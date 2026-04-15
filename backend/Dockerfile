# --- 第一阶段：构建层 (Builder Stage) ---
# 选择 node:20-alpine 以兼顾稳定性与体积
FROM node:20-alpine AS builder

# 设置容器内工作目录
WORKDIR /app

# 首先复制依赖配置文件，利用 Docker 镜像缓存层优化构建速度
COPY package.json package-lock.json ./

# 安装所有依赖（包含开发依赖，用于代码编译）
# 备注：npm ci 比 npm install 在构建环境中更可靠
RUN npm install

# 复制整个项目源码到容器内
COPY . .

# 执行 Prisma 客户端生成与 NestJS 生产环境编译
# 备注：Prisma 生成必须在编译前完成
RUN npm run prisma:generate && npm run build

# --- 第二阶段：生产运行层 (Runner Stage) ---
# 使用同版本的 alpine 镜像作为最终基础镜像
FROM node:20-alpine AS runner

# 设置生产环境环境变量
ENV NODE_ENV=production

WORKDIR /app

# 从构建阶段仅复制必要的工件
# 1. 复制编译后的 dist 目录
COPY --from=builder /app/dist ./dist
# 2. 复制 node_modules (生产依赖版)
COPY --from=builder /app/node_modules ./node_modules
# 3. 复制 package.json 与 prisma 引擎配置
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# 暴露后端服务监听端口 (默认为 3000)
EXPOSE 3000

# 启动前确保数据库连接路径正确 (针对容器内网络)
# 备注：生产环境启动通常直接运行编译后的 JS 文件以获得最佳性能
CMD ["node", "dist/src/main"]
