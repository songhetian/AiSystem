# --- 第一阶段：构建层 (Builder Stage) ---
FROM node:20-alpine AS builder

WORKDIR /app

# 直接复制所有内容（包含已经在本地安装好的 node_modules）
COPY . .

# 构建生产版本 (不再在容器内运行 npm install)
RUN npm run build

# --- 第二阶段：生产运行层 (Runner Stage) ---
FROM node:20-alpine AS runner

WORKDIR /app

# 全局安装serve（这个很快，通常没问题）
RUN npm config set registry https://registry.npmmirror.com && npm install -g serve && apk add --no-cache dos2unix

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 复制启动脚本
COPY entrypoint.sh /app/entrypoint.sh
RUN dos2unix /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# 暴露端口
EXPOSE 8000

# 启动服务
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["serve", "-s", "dist", "-l", "8000"]
