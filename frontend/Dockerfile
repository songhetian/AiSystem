# --- 第一阶段：构建层 (Builder Stage) ---
FROM node:20-alpine AS builder

WORKDIR /app

# 复制依赖配置文件
COPY package.json package-lock.json* ./

# 安装依赖
RUN npm install

# 复制项目源码
COPY . .

# 构建生产版本
RUN npm run build

# --- 第二阶段：生产运行层 (Runner Stage) ---
FROM node:20-alpine AS runner

WORKDIR /app

# 全局安装serve
RUN npm install -g serve

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 暴露端口
EXPOSE 8000

# 启动服务
CMD ["serve", "dist", "-l", "8000"]
