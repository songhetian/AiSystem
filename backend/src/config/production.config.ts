/**
 * 生产环境配置文件
 * Production Environment Configuration
 *
 * 用途：
 * - 数据库连接池配置
 * - Redis 缓存配置
 * - 日志备份定时任务配置
 * - 告警邮件服务配置
 * - 性能监控配置
 *
 * Requirements: 19.1, 21.1, 22.3
 */

export interface DatabaseConfig {
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
}

export interface RedisConfig {
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
}

export interface BackupConfig {
  /** 是否启用自动备份 */
  enabled: boolean;
  /** 备份定时任务 Cron 表达式 */
  schedule: string;
  /** 备份保留天数 */
  retentionDays: number;
  /** 批量处理大小 */
  batchSize: number;
  /** 备份存储路径 */
  storagePath: string;
}

export interface EmailConfig {
  /** SMTP 服务器地址 */
  host: string;
  /** SMTP 端口 */
  port: number;
  /** SMTP 用户名 */
  user: string;
  /** SMTP 密码 */
  password: string;
  /** 发件人邮箱 */
  from: string;
  /** 发件人名称 */
  fromName: string;
  /** 是否使用 TLS */
  useTLS: boolean;
  /** 连接超时时间（毫秒） */
  timeout: number;
}

export interface AlertConfig {
  /** 是否启用告警 */
  enabled: boolean;
  /** 告警去重时间窗口（毫秒） */
  dedupWindowMs: number;
  /** 告警接收者邮箱列表 */
  recipients: string[];
  /** 是否发送邮件告警 */
  emailEnabled: boolean;
  /** 是否发送站内信告警 */
  messageEnabled: boolean;
}

export interface MonitoringConfig {
  /** 是否启用性能监控 */
  enabled: boolean;
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold: number;
  /** 慢接口阈值（毫秒） */
  slowApiThreshold: number;
  /** 是否记录请求详情 */
  logRequestDetails: boolean;
  /** 是否记录响应详情 */
  logResponseDetails: boolean;
  /** 监控数据保留天数 */
  retentionDays: number;
}

export interface ProductionConfig {
  database: DatabaseConfig;
  redis: RedisConfig;
  backup: BackupConfig;
  email: EmailConfig;
  alert: AlertConfig;
  monitoring: MonitoringConfig;
}

/**
 * 生产环境默认配置
 * Requirements: 19.1, 21.1, 22.3
 */
export const productionConfig: ProductionConfig = {
  // 数据库连接池配置
  database: {
    // 连接池最大连接数（根据服务器性能和并发量调整）
    connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '100', 10),
    // 连接池超时时间（秒）
    poolTimeout: parseInt(process.env.DB_POOL_TIMEOUT || '30', 10),
    // 连接超时时间（秒）
    connectTimeout: parseInt(process.env.DB_CONNECT_TIMEOUT || '10', 10),
    // 空闲连接超时时间（秒）
    idleTimeout: parseInt(process.env.DB_IDLE_TIMEOUT || '600', 10),
    // 最小连接数（保持一定数量的连接以提高响应速度）
    minConnections: parseInt(process.env.DB_MIN_CONNECTIONS || '10', 10),
  },

  // Redis 缓存配置
  redis: {
    host: process.env.REDIS_HOST || 'redis-service',
    port: parseInt(process.env.REDIS_PORT || '6379', 10),
    db: parseInt(process.env.REDIS_DB || '0', 10),
    password: process.env.REDIS_PASSWORD,
    // 连接超时时间（毫秒）
    connectTimeout: parseInt(process.env.REDIS_CONNECT_TIMEOUT || '10000', 10),
    // 命令超时时间（毫秒）
    commandTimeout: parseInt(process.env.REDIS_COMMAND_TIMEOUT || '5000', 10),
    // 最大重试次数
    maxRetriesPerRequest: parseInt(process.env.REDIS_MAX_RETRIES || '3', 10),
    // 重试延迟（毫秒）
    retryDelay: parseInt(process.env.REDIS_RETRY_DELAY || '1000', 10),
  },

  // 日志备份配置
  backup: {
    // 是否启用自动备份
    enabled: process.env.AUTO_BACKUP_ENABLED === 'true',
    // 备份定时任务 Cron 表达式（默认每天凌晨 2:00）
    schedule: process.env.BACKUP_CRON || '0 0 2 * * *',
    // 备份保留天数（默认 365 天）
    retentionDays: parseInt(process.env.BACKUP_RETENTION_DAYS || '365', 10),
    // 批量处理大小（避免单次事务过大）
    batchSize: parseInt(process.env.BACKUP_BATCH_SIZE || '5000', 10),
    // 备份存储路径
    storagePath: process.env.BACKUP_PATH || 'storage/backups/',
  },

  // 邮件服务配置
  email: {
    host: process.env.SMTP_HOST || 'smtp.example.com',
    port: parseInt(process.env.SMTP_PORT || '587', 10),
    user: process.env.SMTP_USER || 'noreply@example.com',
    password: process.env.SMTP_PASSWORD || '',
    from: process.env.SMTP_FROM || 'noreply@example.com',
    fromName: process.env.SMTP_FROM_NAME || '雷犀AI客服系统',
    useTLS: process.env.SMTP_USE_TLS === 'true',
    timeout: parseInt(process.env.SMTP_TIMEOUT || '30000', 10),
  },

  // 告警配置
  alert: {
    // 是否启用告警
    enabled: process.env.ALERT_ENABLED !== 'false', // 默认启用
    // 告警去重时间窗口（毫秒，默认 1 小时）
    dedupWindowMs: parseInt(process.env.ALERT_DEDUP_WINDOW_MS || '3600000', 10),
    // 告警接收者邮箱列表（逗号分隔）
    recipients: (process.env.ALERT_RECIPIENTS || '').split(',').filter(Boolean),
    // 是否发送邮件告警
    emailEnabled: process.env.ALERT_EMAIL_ENABLED === 'true',
    // 是否发送站内信告警（默认启用）
    messageEnabled: process.env.ALERT_MESSAGE_ENABLED !== 'false',
  },

  // 性能监控配置
  monitoring: {
    // 是否启用性能监控
    enabled: process.env.PERFORMANCE_MONITORING_ENABLED === 'true',
    // 慢查询阈值（毫秒）
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '200', 10),
    // 慢接口阈值（毫秒）
    slowApiThreshold: parseInt(process.env.SLOW_API_THRESHOLD || '1000', 10),
    // 是否记录请求详情（生产环境建议关闭以减少日志量）
    logRequestDetails: process.env.LOG_REQUEST_DETAILS === 'true',
    // 是否记录响应详情（生产环境建议关闭以减少日志量）
    logResponseDetails: process.env.LOG_RESPONSE_DETAILS === 'true',
    // 监控数据保留天数
    retentionDays: parseInt(process.env.MONITORING_RETENTION_DAYS || '30', 10),
  },
};

/**
 * 获取生产环境配置
 * @returns 生产环境配置对象
 */
export function getProductionConfig(): ProductionConfig {
  return productionConfig;
}

/**
 * 验证生产环境配置
 * 检查必需的配置项是否已设置
 * @throws Error 如果配置不完整
 */
export function validateProductionConfig(): void {
  const errors: string[] = [];

  // 验证数据库配置
  if (productionConfig.database.connectionLimit < 10) {
    errors.push('数据库连接池大小至少应为 10');
  }

  // 验证 Redis 配置
  if (!productionConfig.redis.host) {
    errors.push('Redis 主机地址未配置');
  }

  // 验证邮件配置（如果启用了邮件告警）
  if (productionConfig.alert.emailEnabled) {
    if (!productionConfig.email.host || productionConfig.email.host === 'smtp.example.com') {
      errors.push('邮件服务器地址未配置或使用默认值');
    }
    if (!productionConfig.email.user || productionConfig.email.user === 'noreply@example.com') {
      errors.push('邮件用户名未配置或使用默认值');
    }
    if (!productionConfig.email.password) {
      errors.push('邮件密码未配置');
    }
  }

  // 验证告警接收者
  if (productionConfig.alert.enabled && productionConfig.alert.recipients.length === 0) {
    console.warn('警告：告警已启用但未配置接收者邮箱');
  }

  if (errors.length > 0) {
    throw new Error(`生产环境配置验证失败:\n${errors.join('\n')}`);
  }
}
