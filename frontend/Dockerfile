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

# 全局安装serve，并安装dos2unix转换格式
RUN npm install -g serve && apk add --no-cache dos2unix

# 从构建阶段复制构建产物
COPY --from=builder /app/dist ./dist

# 复制启动脚本
COPY entrypoint.sh /app/entrypoint.sh
RUN dos2unix /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# 暴露端口
EXPOSE 8000

# 启动服务（-s 参数支持 SPA 路由）
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["serve", "-s", "dist", "-l", "8000"]
