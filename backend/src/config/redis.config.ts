/**
 * Redis 缓存配置
 * Redis Cache Configuration
 *
 * Requirements: 19.1, 21.1
 *
 * 职责:
 * - 配置 Redis 连接参数
 * - 配置缓存 TTL 策略
 * - 优化 Redis 性能
 */

export interface RedisCacheConfig {
  /** Redis 主机地址 */
  host: string;
  /** Redis 端口 */
  port: number;
  /** Redis 数据库编号 */
  db: number;
  /** Redis 密码 */
  password?: string;
  /** 连接超时时间（毫秒） */
  connectTimeout: number;
  /** 命令超时时间（毫秒） */
  commandTimeout: number;
  /** 最大重试次数 */
  maxRetriesPerRequest: number;
  /** 重试延迟（毫秒） */
  retryDelay: number;
  /** 是否启用离线队列 */
  enableOfflineQueue: boolean;
  /** 是否启用 Redis 日志 */
  enableLogging: boolean;
}

export interface CacheTTLConfig {
  /** ID 转换缓存 TTL（秒） */
  idConverter: number;
  /** 用户信息缓存 TTL（秒） */
  userInfo: number;
  /** 平台信息缓存 TTL（秒） */
  platformInfo: number;
  /** 部门信息缓存 TTL（秒） */
  departmentInfo: number;
  /** 店铺信息缓存 TTL（秒） */
  shopInfo: number;
  /** 日志查询缓存 TTL（秒） */
  logQuery: number;
  /** 会话缓存 TTL（秒） */
  session: number;
  /** 幂等性缓存 TTL（秒） */
  idempotency: number;
}

/**
 * 获取 Redis 缓存配置
 * Requirements: 19.1
 */
export function getRedisCacheConfig(): RedisCacheConfig {
  return {
    // Redis 主机地址
    host: process.env.REDIS_HOST || 'redis-service',

    // Redis 端口
    port: parseInt(process.env.REDIS_PORT || '6379', 10),

    // Redis 数据库编号
    db: parseInt(process.env.REDIS_DB || '0', 10),

    // Redis 密码
    password: process.env.REDIS_PASSWORD || undefined,

    // 连接超时时间（毫秒）
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),

    // 命令超时时间（毫秒）
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),

    // 最大重试次数
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),

    // 重试延迟（毫秒）
    retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),

    // 是否启用离线队列
    // 当 Redis 连接断开时，是否将命令缓存到队列中
    enableOfflineQueue: process.env.REDIS_ENABLE_OFFLINE_QUEUE !== 'false',

    // 是否启用 Redis 日志
    enableLogging: process.env.REDIS_LOGGING === 'true',
  };
}

/**
 * 获取缓存 TTL 配置
 * Requirements: 19.1, 21.1
 */
export function getCacheTTLConfig(): CacheTTLConfig {
  return {
    // ID 转换缓存 TTL（秒）
    // 用户、平台、部门、店铺 ID 到名称的映射缓存
    // 建议: 1 小时（3600 秒）
    idConverter: parseInt(process.env.CACHE_TTL_ID_CONVERTER || '3600', 10),

    // 用户信息缓存 TTL（秒）
    // 建议: 30 分钟（1800 秒）
    userInfo: parseInt(process.env.CACHE_TTL_USER_INFO || '1800', 10),

    // 平台信息缓存 TTL（秒）
    // 建议: 1 小时（3600 秒）
    platformInfo: parseInt(process.env.CACHE_TTL_PLATFORM_INFO || '3600', 10),

    // 部门信息缓存 TTL（秒）
    // 建议: 1 小时（3600 秒）
    departmentInfo: parseInt(process.env.CACHE_TTL_DEPARTMENT_INFO || '3600', 10),

    // 店铺信息缓存 TTL（秒）
    // 建议: 1 小时（3600 秒）
    shopInfo: parseInt(process.env.CACHE_TTL_SHOP_INFO || '3600', 10),

    // 日志查询缓存 TTL（秒）
    // 建议: 5 分钟（300 秒）
    logQuery: parseInt(process.env.CACHE_TTL_LOG_QUERY || '300', 10),

    // 会话缓存 TTL（秒）
    // 建议: 2 小时（7200 秒）
    session: parseInt(process.env.CACHE_TTL_SESSION || '7200', 10),

    // 幂等性缓存 TTL（秒）
    // 建议: 5 分钟（300 秒）
    idempotency: parseInt(process.env.IDEMPOTENCY_TTL_SECONDS || '300', 10),
  };
}

/**
 * 构建 Redis 连接 URL
 * Requirements: 19.1
 *
 * @returns Redis 连接 URL
 */
export function buildRedisUrl(): string {
  const config = getRedisCacheConfig();

  if (process.env.REDIS_URL) {
    return process.env.REDIS_URL;
  }

  const auth = config.password ? `:${config.password}@` : '';
  return `redis://${auth}${config.host}:${config.port}/${config.db}`;
}

/**
 * 验证 Redis 缓存配置
 * Requirements: 19.1
 *
 * @throws Error 如果配置不合理
 */
export function validateRedisCacheConfig(): void {
  const config = getRedisCacheConfig();
  const errors: string[] = [];

  // 验证主机地址
  if (!config.host) {
    errors.push('Redis 主机地址未配置');
  }

  // 验证端口
  if (config.port < 1 || config.port > 65535) {
    errors.push('Redis 端口号无效');
  }

  // 验证数据库编号
  if (config.db < 0 || config.db > 15) {
    errors.push('Redis 数据库编号应在 0-15 之间');
  }

  // 验证超时时间
  if (config.connectTimeout < 1000) {
    errors.push('连接超时时间至少应为 1000 毫秒');
  }

  if (config.commandTimeout < 1000) {
    errors.push('命令超时时间至少应为 1000 毫秒');
  }

  // 验证重试配置
  if (config.maxRetriesPerRequest < 0) {
    errors.push('最大重试次数不能为负数');
  }

  if (config.retryDelay < 100) {
    errors.push('重试延迟至少应为 100 毫秒');
  }

  if (errors.length > 0) {
    throw new Error(`Redis 缓存配置验证失败:\n${errors.join('\n')}`);
  }
}

/**
 * 验证缓存 TTL 配置
 * Requirements: 19.1
 *
 * @throws Error 如果配置不合理
 */
export function validateCacheTTLConfig(): void {
  const config = getCacheTTLConfig();
  const errors: string[] = [];

  // 验证所有 TTL 值都是正数
  Object.entries(config).forEach(([key, value]) => {
    if (value < 0) {
      errors.push(`${key} TTL 不能为负数`);
    }
    if (value > 86400) {
      // 超过 1 天
      console.warn(`警告: ${key} TTL 超过 1 天（${value} 秒），可能导致数据过期`);
    }
  });

  if (errors.length > 0) {
    throw new Error(`缓存 TTL 配置验证失败:\n${errors.join('\n')}`);
  }
}

/**
 * 获取 Redis 缓存配置说明
 * Requirements: 19.1
 */
export function getRedisCacheConfigDescription(): Record<string, string> {
  return {
    host: 'Redis 主机地址',
    port: 'Redis 端口',
    db: 'Redis 数据库编号（0-15）',
    password: 'Redis 密码',
    connectTimeout: '连接超时时间（毫秒）',
    commandTimeout: '命令超时时间（毫秒）',
    maxRetriesPerRequest: '最大重试次数',
    retryDelay: '重试延迟（毫秒）',
    enableOfflineQueue: '是否启用离线队列',
    enableLogging: '是否启用 Redis 日志',
  };
}

/**
 * 获取缓存 TTL 配置说明
 * Requirements: 19.1
 */
export function getCacheTTLConfigDescription(): Record<string, string> {
  return {
    idConverter: 'ID 转换缓存 TTL（秒），建议 1 小时',
    userInfo: '用户信息缓存 TTL（秒），建议 30 分钟',
    platformInfo: '平台信息缓存 TTL（秒），建议 1 小时',
    departmentInfo: '部门信息缓存 TTL（秒），建议 1 小时',
    shopInfo: '店铺信息缓存 TTL（秒），建议 1 小时',
    logQuery: '日志查询缓存 TTL（秒），建议 5 分钟',
    session: '会话缓存 TTL（秒），建议 2 小时',
    idempotency: '幂等性缓存 TTL（秒），建议 5 分钟',
  };
}
