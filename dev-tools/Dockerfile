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

# 启动 Mock Server
CMD ["npx", "ts-node", "mock-server.ts"]
