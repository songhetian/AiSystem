# --- 生产运行层 (Runner Stage) ---
FROM node:20-alpine

WORKDIR /app

# 全局安装serve
RUN npm config set registry https://registry.npmmirror.com && npm install -g serve && apk add --no-cache dos2unix

# 直接将本地生成的编译产物拷贝到镜像
COPY ./dist ./dist

# 复制启动脚本
COPY entrypoint.sh /app/entrypoint.sh
RUN dos2unix /app/entrypoint.sh && chmod +x /app/entrypoint.sh

# 暴露端口
EXPOSE 8000

# 启动服务
ENTRYPOINT ["/app/entrypoint.sh"]
CMD ["serve", "-s", "dist", "-l", "8000"]
