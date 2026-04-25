#!/bin/sh

# 运行时配置生成脚本
# 从环境变量读取配置，替换config.js中的占位符

CONFIG_FILE="/app/dist/config.js"

# 总是从public目录复制最新的配置模板
if [ -f "/app/public/config.js" ]; then
  cp /app/public/config.js "$CONFIG_FILE"
fi

# 替换API基础URL
if [ -n "$VITE_API_BASE_URL" ]; then
  sed -i "s|__API_BASE_URL__|$VITE_API_BASE_URL|g" "$CONFIG_FILE"
else
  # 如果没有设置环境变量，使用默认值
  sed -i "s|__API_BASE_URL__|/api/v1|g" "$CONFIG_FILE"
fi

echo "运行时配置已生成："
echo "API_BASE_URL: $VITE_API_BASE_URL"

# 启动应用
exec "$@"
