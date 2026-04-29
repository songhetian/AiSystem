/**
 * 数据库连接池配置
 * Database Connection Pool Configuration
 *
 * Requirements: 19.1, 21.1
 *
 * 职责:
 * - 配置 Prisma 数据库连接池参数
 * - 优化数据库连接性能
 * - 支持高并发场景
 */

export interface DatabasePoolConfig {
  /** 连接池最大连接数 */
  connectionLimit: number;
  /** 连接池超时时间（秒） */
  poolTimeout: number;
  /** 连接超时时间（秒） */
  connectTimeout: number;
  /** 空闲连接超时时间（秒） */
  idleTimeout: number;
  /** 最小连接数 */
  minConnections: number;
  /** 是否启用连接池日志 */
  enableLogging: boolean;
}

/**
 * 获取数据库连接池配置
 * Requirements: 19.1
 */
export function getDatabasePoolConfig(): DatabasePoolConfig {
  return {
    // 连接池最大连接数
    // 生产环境建议: 100-200 (根据服务器性能和并发量调整)
    // 开发环境建议: 10-20
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '100', 10),

    // 连接池超时时间（秒）
    // 从连接池获取连接的最大等待时间
    poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '30', 10),

    // 连接超时时间（秒）
    // 初始连接数据库的最大等待时间
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10', 10),

    // 空闲连接超时时间（秒）
    // 空闲连接在连接池中保持的最长时间
    // 超过此时间的空闲连接将被关闭
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '600', 10),

    // 最小连接数
    // 连接池中保持的最小连接数，提高响应速度
    // Prisma 会自动管理，约为 max 的 20%
    minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '10', 10),

    // 是否启用连接池日志
    // 生产环境建议关闭，开发环境可以开启
    enableLogging: process.env.DB_POOL_LOGGING === 'true',
  };
}

/**
 * 构建 Prisma 数据库连接字符串
 * Requirements: 19.1
 *
 * @param baseUrl 基础数据库 URL
 * @returns 包含连接池配置的完整连接字符串
 */
export function buildDatabaseUrl(baseUrl?: string): string {
  const url = baseUrl || process.env.DATABASE_URL;
  if (!url) {
    throw new Error('DATABASE_URL is not defined');
  }

  const config = getDatabasePoolConfig();

  // 解析现有 URL
  const urlObj = new URL(url);

  // 添加或更新连接池参数
  urlObj.searchParams.set('connection_limit', config.connectionLimit.toString());
  urlObj.searchParams.set('pool_timeout', config.poolTimeout.toString());
  urlObj.searchParams.set('connect_timeout', config.connectTimeout.toString());

  return urlObj.toString();
}

/**
 * 验证数据库连接池配置
 * Requirements: 19.1
 *
 * @throws Error 如果配置不合理
 */
export function validateDatabasePoolConfig(): void {
  const config = getDatabasePoolConfig();
  const errors: string[] = [];

  // 验证连接池大小
  if (config.connectionLimit < 10) {
    errors.push('连接池最大连接数至少应为 10');
  }

  if (config.connectionLimit > 1000) {
    errors.push('连接池最大连接数不应超过 1000');
  }

  // 验证最小连接数
  if (config.minConnections < 1) {
    errors.push('最小连接数至少应为 1');
  }

  if (config.minConnections > config.connectionLimit) {
    errors.push('最小连接数不能大于最大连接数');
  }

  // 验证超时时间
  if (config.poolTimeout < 5) {
    errors.push('连接池超时时间至少应为 5 秒');
  }

  if (config.connectTimeout < 5) {
    errors.push('连接超时时间至少应为 5 秒');
  }

  if (config.idleTimeout < 60) {
    errors.push('空闲连接超时时间至少应为 60 秒');
  }

  if (errors.length > 0) {
    throw new Error(`数据库连接池配置验证失败:\n${errors.join('\n')}`);
  }
}

/**
 * 获取数据库连接池配置说明
 * Requirements: 19.1
 */
export function getDatabasePoolConfigDescription(): Record<string, string> {
  return {
    connectionLimit: '连接池最大连接数，根据服务器性能和并发量调整',
    poolTimeout: '从连接池获取连接的最大等待时间（秒）',
    connectTimeout: '初始连接数据库的最大等待时间（秒）',
    idleTimeout: '空闲连接在连接池中保持的最长时间（秒）',
    minConnections: '连接池中保持的最小连接数',
    enableLogging: '是否启用连接池日志（生产环境建议关闭）',
  };
}
