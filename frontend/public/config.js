/**
 * 运行时配置文件
 * 此文件在容器启动时会被动态生成，从环境变量读取配置
 * 优先级高于构建时的环境变量
 */
window.APP_CONFIG = {
  // API基础URL - 从环境变量VITE_API_BASE_URL读取
  apiBaseUrl: '__API_BASE_URL__',
  
  // 其他运行时配置可以在这里添加
  // 例如：
  // version: '__APP_VERSION__',
  // environment: '__NODE_ENV__',
};
