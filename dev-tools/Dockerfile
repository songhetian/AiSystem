FROM node:20-slim

WORKDIR /app

# 复制依赖定义
COPY package*.json ./

# 安装依赖
RUN npm install

# 复制所有代码
COPY . .

# 暴露 3888 端口
EXPOSE 3888

# 健康检测
HEALTHCHECK --interval=30s --timeout=3s \
  CMD node -e "require('http').get('http://localhost:3888/health', (r) => { if (r.statusCode !== 200) process.exit(1); })" || exit 1

# 启动 Mock Server
CMD ["npx", "ts-node", "mock-server.ts"]
