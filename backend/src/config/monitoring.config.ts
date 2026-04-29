/**
 * 监控和告警配置
 * Monitoring and Alerting Configuration
 *
 * Requirements: 22.1, 22.2, 22.4
 *
 * 职责:
 * - 配置日志系统性能监控参数
 * - 配置异常告警规则
 * - 配置备份任务监控
 */

export interface PerformanceMonitoringConfig {
  /** 是否启用性能监控 */
  enabled: boolean;
  /** 慢查询阈值（毫秒） */
  slowQueryThreshold: number;
  /** 慢接口阈值（毫秒） */
  slowApiThreshold: number;
  /** 日志写入速率告警阈值（条/分钟） */
  logWriteRateThreshold: number;
  /** 错误日志数量告警阈值（条/10分钟） */
  errorLogCountThreshold: number;
  /** 连续慢查询告警阈值（次） */
  consecutiveSlowQueryThreshold: number;
  /** 是否记录请求详情 */
  logRequestDetails: boolean;
  /** 是否记录响应详情 */
  logResponseDetails: boolean;
  /** 监控数据保留天数 */
  retentionDays: number;
  /** 监控检查间隔（分钟） */
  checkIntervalMinutes: number;
}

export interface ExceptionAlertConfig {
  /** 是否启用异常告警 */
  enabled: boolean;
  /** 告警去重时间窗口（毫秒） */
  dedupWindowMs: number;
  /** 告警数量异常阈值（条/10分钟） */
  alertCountThreshold: number;
  /** 无效ID告警阈值（条/10分钟） */
  invalidIdAlertThreshold: number;
  /** 是否发送邮件告警 */
  emailEnabled: boolean;
  /** 是否发送站内信告警 */
  messageEnabled: boolean;
  /** 告警接收者邮箱列表 */
  recipients: string[];
  /** 异常监控检查间隔（分钟） */
  checkIntervalMinutes: number;
}

export interface BackupMonitoringConfig {
  /** 是否启用备份任务监控 */
  enabled: boolean;
  /** 备份任务超时告警阈值（小时） */
  backupTimeoutHours: number;
  /** 归档数据过期告警阈值（小时） */
  archiveAgeThreshold: number;
  /** 备份任务监控检查间隔（小时） */
  checkIntervalHours: number;
  /** 是否在备份失败时发送告警 */
  alertOnBackupFailure: boolean;
  /** 是否在备份成功时发送通知 */
  notifyOnBackupSuccess: boolean;
}

export interface AlertRuleConfig {
  /** 日志记录异常告警规则 */
  logRecordingError: {
    enabled: boolean;
    level: 'info' | 'warning' | 'error' | 'critical';
  };
  /** 日志查询异常告警规则 */
  logQueryError: {
    enabled: boolean;
    level: 'info' | 'warning' | 'error' | 'critical';
  };
  /** 日志导出异常告警规则 */
  logExportError: {
    enabled: boolean;
    level: 'info' | 'warning' | 'error' | 'critical';
  };
  /** 无效ID告警规则 */
  invalidIdWarning: {
    enabled: boolean;
    level: 'info' | 'warning' | 'error' | 'critical';
  };
  /** 未知模块告警规则 */
  unknownModuleWarning: {
    enabled: boolean;
    level: 'info' | 'warning' | 'error' | 'critical';
  };
  /** 数据库连接失败告警规则 */
  databaseConnectionFailed: {
    enabled: boolean;
    level: 'info' | 'warning' | 'error' | 'critical';
  };
}

/**
 * 获取性能监控配置
 * Requirements: 22.1
 */
export function getPerformanceMonitoringConfig(): PerformanceMonitoringConfig {
  return {
    // 是否启用性能监控
    enabled: process.env.PERFORMANCE_MONITORING_ENABLED === 'true',

    // 慢查询阈值（毫秒）
    // 超过此时间的数据库查询会被记录
    slowQueryThreshold: parseInt(process.env.SLOW_QUERY_THRESHOLD || '200', 10),

    // 慢接口阈值（毫秒）
    // 超过此时间的 API 请求会被记录
    slowApiThreshold: parseInt(process.env.SLOW_API_THRESHOLD || '1000', 10),

    // 日志写入速率告警阈值（条/分钟）
    // 超过此速率会触发告警
    logWriteRateThreshold: parseInt(process.env.LOG_WRITE_RATE_THRESHOLD || '1000', 10),

    // 错误日志数量告警阈值（条/10分钟）
    // 超过此数量会触发告警
    errorLogCountThreshold: parseInt(process.env.ERROR_LOG_COUNT_THRESHOLD || '50', 10),

    // 连续慢查询告警阈值（次）
    // 连续多次慢查询会触发告警
    consecutiveSlowQueryThreshold: parseInt(
      process.env.CONSECUTIVE_SLOW_QUERY_THRESHOLD || '3',
      10,
    ),

    // 是否记录请求详情
    // 生产环境建议关闭以减少日志量
    logRequestDetails: process.env.LOG_REQUEST_DETAILS === 'true',

    // 是否记录响应详情
    // 生产环境建议关闭以减少日志量
    logResponseDetails: process.env.LOG_RESPONSE_DETAILS === 'true',

    // 监控数据保留天数
    retentionDays: parseInt(process.env.MONITORING_RETENTION_DAYS || '30', 10),

    // 监控检查间隔（分钟）
    checkIntervalMinutes: parseInt(process.env.MONITORING_CHECK_INTERVAL_MINUTES || '5', 10),
  };
}

/**
 * 获取异常告警配置
 * Requirements: 22.2
 */
export function getExceptionAlertConfig(): ExceptionAlertConfig {
  return {
    // 是否启用异常告警
    enabled: process.env.ALERT_ENABLED !== 'false', // 默认启用

    // 告警去重时间窗口（毫秒）
    // 在此时间窗口内，相同的告警只触发一次
    dedupWindowMs: parseInt(process.env.ALERT_DEDUP_WINDOW_MS || '3600000', 10), // 1 小时

    // 告警数量异常阈值（条/10分钟）
    // 超过此数量会触发高级别告警
    alertCountThreshold: parseInt(process.env.ALERT_COUNT_THRESHOLD || '20', 10),

    // 无效ID告警阈值（条/10分钟）
    // 超过此数量会触发告警
    invalidIdAlertThreshold: parseInt(process.env.INVALID_ID_ALERT_THRESHOLD || '10', 10),

    // 是否发送邮件告警
    emailEnabled: process.env.ALERT_EMAIL_ENABLED === 'true',

    // 是否发送站内信告警
    messageEnabled: process.env.ALERT_MESSAGE_ENABLED !== 'false', // 默认启用

    // 告警接收者邮箱列表（逗号分隔）
    recipients: (process.env.ALERT_RECIPIENTS || '').split(',').filter(Boolean),

    // 异常监控检查间隔（分钟）
    checkIntervalMinutes: parseInt(process.env.EXCEPTION_CHECK_INTERVAL_MINUTES || '10', 10),
  };
}

/**
 * 获取备份任务监控配置
 * Requirements: 22.4
 */
export function getBackupMonitoringConfig(): BackupMonitoringConfig {
  return {
    // 是否启用备份任务监控
    enabled: process.env.BACKUP_MONITORING_ENABLED !== 'false', // 默认启用

    // 备份任务超时告警阈值（小时）
    // 如果备份任务超过此时间未完成，触发告警
    backupTimeoutHours: parseInt(process.env.BACKUP_TIMEOUT_HOURS || '2', 10),

    // 归档数据过期告警阈值（小时）
    // 如果归档数据超过此时间未更新，触发告警
    archiveAgeThreshold: parseInt(process.env.ARCHIVE_AGE_THRESHOLD_HOURS || '48', 10),

    // 备份任务监控检查间隔（小时）
    checkIntervalHours: parseInt(process.env.BACKUP_CHECK_INTERVAL_HOURS || '1', 10),

    // 是否在备份失败时发送告警
    alertOnBackupFailure: process.env.ALERT_ON_BACKUP_FAILURE !== 'false', // 默认启用

    // 是否在备份成功时发送通知
    notifyOnBackupSuccess: process.env.NOTIFY_ON_BACKUP_SUCCESS === 'true',
  };
}

/**
 * 获取告警规则配置
 * Requirements: 22.1, 22.2, 22.4
 */
export function getAlertRuleConfig(): AlertRuleConfig {
  return {
    // 日志记录异常告警规则
    logRecordingError: {
      enabled: process.env.ALERT_RULE_LOG_RECORDING_ERROR_ENABLED !== 'false',
      level: (process.env.ALERT_RULE_LOG_RECORDING_ERROR_LEVEL as any) || 'error',
    },

    // 日志查询异常告警规则
    logQueryError: {
      enabled: process.env.ALERT_RULE_LOG_QUERY_ERROR_ENABLED !== 'false',
      level: (process.env.ALERT_RULE_LOG_QUERY_ERROR_LEVEL as any) || 'error',
    },

    // 日志导出异常告警规则
    logExportError: {
      enabled: process.env.ALERT_RULE_LOG_EXPORT_ERROR_ENABLED !== 'false',
      level: (process.env.ALERT_RULE_LOG_EXPORT_ERROR_LEVEL as any) || 'error',
    },

    // 无效ID告警规则
    invalidIdWarning: {
      enabled: process.env.ALERT_RULE_INVALID_ID_WARNING_ENABLED !== 'false',
      level: (process.env.ALERT_RULE_INVALID_ID_WARNING_LEVEL as any) || 'warning',
    },

    // 未知模块告警规则
    unknownModuleWarning: {
      enabled: process.env.ALERT_RULE_UNKNOWN_MODULE_WARNING_ENABLED !== 'false',
      level: (process.env.ALERT_RULE_UNKNOWN_MODULE_WARNING_LEVEL as any) || 'warning',
    },

    // 数据库连接失败告警规则
    databaseConnectionFailed: {
      enabled: process.env.ALERT_RULE_DATABASE_CONNECTION_FAILED_ENABLED !== 'false',
      level: (process.env.ALERT_RULE_DATABASE_CONNECTION_FAILED_LEVEL as any) || 'critical',
    },
  };
}

/**
 * 验证性能监控配置
 * Requirements: 22.1
 *
 * @throws Error 如果配置不合理
 */
export function validatePerformanceMonitoringConfig(): void {
  const config = getPerformanceMonitoringConfig();

  if (!config.enabled) {
    console.log('性能监控已禁用，跳过配置验证');
    return;
  }

  const errors: string[] = [];

  // 验证阈值
  if (config.slowQueryThreshold < 50) {
    errors.push('慢查询阈值至少应为 50 毫秒');
  }

  if (config.slowApiThreshold < 100) {
    errors.push('慢接口阈值至少应为 100 毫秒');
  }

  if (config.logWriteRateThreshold < 10) {
    errors.push('日志写入速率阈值至少应为 10 条/分钟');
  }

  if (config.errorLogCountThreshold < 1) {
    errors.push('错误日志数量阈值至少应为 1 条');
  }

  if (config.consecutiveSlowQueryThreshold < 1) {
    errors.push('连续慢查询阈值至少应为 1 次');
  }

  // 验证保留天数
  if (config.retentionDays < 1) {
    errors.push('监控数据保留天数至少应为 1 天');
  }

  if (config.retentionDays > 365) {
    console.warn('警告: 监控数据保留天数超过 1 年，可能占用大量存储空间');
  }

  // 验证检查间隔
  if (config.checkIntervalMinutes < 1) {
    errors.push('监控检查间隔至少应为 1 分钟');
  }

  if (errors.length > 0) {
    throw new Error(`性能监控配置验证失败:\n${errors.join('\n')}`);
  }
}

/**
 * 验证异常告警配置
 * Requirements: 22.2
 *
 * @throws Error 如果配置不合理
 */
export function validateExceptionAlertConfig(): void {
  const config = getExceptionAlertConfig();

  if (!config.enabled) {
    console.log('异常告警已禁用，跳过配置验证');
    return;
  }

  const errors: string[] = [];

  // 验证去重时间窗口
  if (config.dedupWindowMs < 60000) {
    // 至少 1 分钟
    errors.push('告警去重时间窗口至少应为 60000 毫秒（1 分钟）');
  }

  // 验证阈值
  if (config.alertCountThreshold < 1) {
    errors.push('告警数量阈值至少应为 1 条');
  }

  if (config.invalidIdAlertThreshold < 1) {
    errors.push('无效ID告警阈值至少应为 1 条');
  }

  // 验证邮件告警配置
  if (config.emailEnabled && config.recipients.length === 0) {
    console.warn('警告: 邮件告警已启用但未配置接收者邮箱');
  }

  // 验证检查间隔
  if (config.checkIntervalMinutes < 1) {
    errors.push('异常监控检查间隔至少应为 1 分钟');
  }

  if (errors.length > 0) {
    throw new Error(`异常告警配置验证失败:\n${errors.join('\n')}`);
  }
}

/**
 * 验证备份任务监控配置
 * Requirements: 22.4
 *
 * @throws Error 如果配置不合理
 */
export function validateBackupMonitoringConfig(): void {
  const config = getBackupMonitoringConfig();

  if (!config.enabled) {
    console.log('备份任务监控已禁用，跳过配置验证');
    return;
  }

  const errors: string[] = [];

  // 验证超时阈值
  if (config.backupTimeoutHours < 1) {
    errors.push('备份任务超时阈值至少应为 1 小时');
  }

  if (config.archiveAgeThreshold < 24) {
    errors.push('归档数据过期阈值至少应为 24 小时');
  }

  // 验证检查间隔
  if (config.checkIntervalHours < 1) {
    errors.push('备份任务监控检查间隔至少应为 1 小时');
  }

  if (errors.length > 0) {
    throw new Error(`备份任务监控配置验证失败:\n${errors.join('\n')}`);
  }
}

/**
 * 验证所有监控配置
 * Requirements: 22.1, 22.2, 22.4
 *
 * @throws Error 如果任何配置不合理
 */
export function validateAllMonitoringConfigs(): void {
  validatePerformanceMonitoringConfig();
  validateExceptionAlertConfig();
  validateBackupMonitoringConfig();
}

/**
 * 获取监控配置说明
 * Requirements: 22.1, 22.2, 22.4
 */
export function getMonitoringConfigDescription(): Record<string, string> {
  return {
    performanceMonitoring: '性能监控配置，用于监控日志系统性能指标',
    exceptionAlert: '异常告警配置，用于监控和告警异常情况',
    backupMonitoring: '备份任务监控配置，用于监控备份任务执行状态',
    alertRules: '告警规则配置，定义各类告警的启用状态和级别',
  };
}
