# --- 第一阶段：构建层 (Builder Stage) ---
# 选择 node:20-alpine 以兼顾稳定性与体积
FROM node:20-alpine AS builder

# 设置容器内工作目录
WORKDIR /app

# 首先复制依赖配置文件，利用 Docker 镜像缓存层优化构建速度
COPY package.json package-lock.json ./

# 安装所有依赖（包含开发依赖，用于代码编译）
RUN npm install

# 复制整个项目源码到容器内
COPY . .

# 执行 Prisma 客户端生成与 NestJS 生产环境编译
RUN npm run prisma:generate && npm run build

# --- 第二阶段：生产运行层 (Runner Stage) ---
# 使用同版本的 alpine 镜像作为最终基础镜像
FROM node:20-alpine AS runner

# 设置生产环境环境变量
ENV NODE_ENV=production

WORKDIR /app

# 从构建阶段仅复制必要的工件
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/node_modules ./node_modules
COPY --from=builder /app/package.json ./
COPY --from=builder /app/prisma ./prisma

# 暴露后端服务监听端口 (默认为 3000)
EXPOSE 3000

# 启动命令
CMD ["node", "dist/main.js"]
