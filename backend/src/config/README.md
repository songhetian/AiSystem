# 生产环境配置文档

## 概述

本目录包含系统日志管理系统的生产环境配置文件，用于配置数据库连接池、Redis 缓存、邮件服务、性能监控和告警系统。

## 配置文件说明

### 1. production.config.ts
主配置文件，整合所有子配置模块。

**Requirements**: 19.1, 21.1, 22.3

### 2. database.config.ts
数据库连接池配置。

**Requirements**: 19.1, 21.1

**配置项**:
- `connectionLimit`: 连接池最大连接数（默认: 100）
- `poolTimeout`: 连接池超时时间（默认: 30 秒）
- `connectTimeout`: 连接超时时间（默认: 10 秒）
- `idleTimeout`: 空闲连接超时时间（默认: 600 秒）
- `minConnections`: 最小连接数（默认: 10）

### 3. redis.config.ts
Redis 缓存配置。

**Requirements**: 19.1, 21.1

**配置项**:
- `host`: Redis 主机地址
- `port`: Redis 端口（默认: 6379）
- `db`: Redis 数据库编号（默认: 0）
- `password`: Redis 密码
- `connectTimeout`: 连接超时时间（默认: 10000 毫秒）
- `commandTimeout`: 命令超时时间（默认: 5000 毫秒）

**缓存 TTL 配置**:
- `idConverter`: ID 转换缓存（默认: 3600 秒）
- `userInfo`: 用户信息缓存（默认: 1800 秒）
- `platformInfo`: 平台信息缓存（默认: 3600 秒）
- `departmentInfo`: 部门信息缓存（默认: 3600 秒）
- `shopInfo`: 店铺信息缓存（默认: 3600 秒）
- `logQuery`: 日志查询缓存（默认: 300 秒）

### 4. email.config.ts
邮件服务配置。

**Requirements**: 22.3

**配置项**:
- `host`: SMTP 服务器地址
- `port`: SMTP 端口（25/465/587）
- `user`: SMTP 用户名
- `password`: SMTP 密码或授权码
- `from`: 发件人邮箱
- `fromName`: 发件人名称
- `useTLS`: 是否使用 TLS
- `timeout`: 连接超时时间（默认: 30000 毫秒）

### 5. monitoring.config.ts
监控和告警配置。

**Requirements**: 22.1, 22.2, 22.4

**性能监控配置**:
- `slowQueryThreshold`: 慢查询阈值（默认: 200 毫秒）
- `slowApiThreshold`: 慢接口阈值（默认: 1000 毫秒）
- `logWriteRateThreshold`: 日志写入速率阈值（默认: 1000 条/分钟）
- `errorLogCountThreshold`: 错误日志数量阈值（默认: 50 条/10分钟）

**异常告警配置**:
- `dedupWindowMs`: 告警去重时间窗口（默认: 3600000 毫秒）
- `alertCountThreshold`: 告警数量阈值（默认: 20 条/10分钟）
- `invalidIdAlertThreshold`: 无效ID告警阈值（默认: 10 条/10分钟）
- `emailEnabled`: 是否发送邮件告警
- `messageEnabled`: 是否发送站内信告警

**备份任务监控配置**:
- `backupTimeoutHours`: 备份任务超时阈值（默认: 2 小时）
- `archiveAgeThreshold`: 归档数据过期阈值（默认: 48 小时）
- `checkIntervalHours`: 监控检查间隔（默认: 1 小时）

## 环境变量配置

### 数据库配置

```bash
# 数据库连接池配置
DB_CONNECTION_LIMIT=100          # 连接池最大连接数
DB_POOL_TIMEOUT=30               # 连接池超时时间（秒）
DB_CONNECT_TIMEOUT=10            # 连接超时时间（秒）
DB_IDLE_TIMEOUT=600              # 空闲连接超时时间（秒）
DB_MIN_CONNECTIONS=10            # 最小连接数
DB_POOL_LOGGING=false            # 是否启用连接池日志
```

### Redis 配置

```bash
# Redis 连接配置
REDIS_HOST=redis-service         # Redis 主机地址
REDIS_PORT=6379                  # Redis 端口
REDIS_DB=0                       # Redis 数据库编号
REDIS_PASSWORD=changeme_redis    # Redis 密码
REDIS_CONNECT_TIMEOUT=10000      # 连接超时时间（毫秒）
REDIS_COMMAND_TIMEOUT=5000       # 命令超时时间（毫秒）
REDIS_MAX_RETRIES=3              # 最大重试次数
REDIS_RETRY_DELAY=1000           # 重试延迟（毫秒）
REDIS_ENABLE_OFFLINE_QUEUE=true  # 是否启用离线队列
REDIS_LOGGING=false              # 是否启用 Redis 日志

# 缓存 TTL 配置
CACHE_TTL_ID_CONVERTER=3600      # ID 转换缓存 TTL（秒）
CACHE_TTL_USER_INFO=1800         # 用户信息缓存 TTL（秒）
CACHE_TTL_PLATFORM_INFO=3600     # 平台信息缓存 TTL（秒）
CACHE_TTL_DEPARTMENT_INFO=3600   # 部门信息缓存 TTL（秒）
CACHE_TTL_SHOP_INFO=3600         # 店铺信息缓存 TTL（秒）
CACHE_TTL_LOG_QUERY=300          # 日志查询缓存 TTL（秒）
CACHE_TTL_SESSION=7200           # 会话缓存 TTL（秒）
```

### 邮件服务配置

```bash
# SMTP 配置
SMTP_HOST=smtp.example.com       # SMTP 服务器地址
SMTP_PORT=587                    # SMTP 端口
SMTP_USER=noreply@example.com    # SMTP 用户名
SMTP_PASSWORD=changeme_smtp      # SMTP 密码
SMTP_FROM=noreply@example.com    # 发件人邮箱
SMTP_FROM_NAME=雷犀AI客服系统     # 发件人名称
SMTP_USE_TLS=true                # 是否使用 TLS
SMTP_USE_SSL=false               # 是否使用 SSL
SMTP_TIMEOUT=30000               # 连接超时时间（毫秒）
SMTP_ENABLED=true                # 是否启用邮件服务

# 告警邮件配置
ALERT_EMAIL_SUBJECT_PREFIX=[系统告警]  # 告警邮件主题前缀
```

### 备份配置

```bash
# 日志备份配置
AUTO_BACKUP_ENABLED=true         # 是否启用自动备份
BACKUP_CRON=0 0 2 * * *          # 备份定时任务 Cron 表达式
BACKUP_RETENTION_DAYS=365        # 备份保留天数
BACKUP_BATCH_SIZE=5000           # 批量处理大小
BACKUP_PATH=storage/backups/     # 备份存储路径
```

### 性能监控配置

```bash
# 性能监控
PERFORMANCE_MONITORING_ENABLED=true  # 是否启用性能监控
SLOW_QUERY_THRESHOLD=200             # 慢查询阈值（毫秒）
SLOW_API_THRESHOLD=1000              # 慢接口阈值（毫秒）
LOG_WRITE_RATE_THRESHOLD=1000        # 日志写入速率阈值（条/分钟）
ERROR_LOG_COUNT_THRESHOLD=50         # 错误日志数量阈值（条/10分钟）
CONSECUTIVE_SLOW_QUERY_THRESHOLD=3   # 连续慢查询阈值（次）
LOG_REQUEST_DETAILS=false            # 是否记录请求详情
LOG_RESPONSE_DETAILS=false           # 是否记录响应详情
MONITORING_RETENTION_DAYS=30         # 监控数据保留天数
MONITORING_CHECK_INTERVAL_MINUTES=5  # 监控检查间隔（分钟）
```

### 异常告警配置

```bash
# 异常告警
ALERT_ENABLED=true                   # 是否启用告警
ALERT_DEDUP_WINDOW_MS=3600000        # 告警去重时间窗口（毫秒）
ALERT_COUNT_THRESHOLD=20             # 告警数量阈值（条/10分钟）
INVALID_ID_ALERT_THRESHOLD=10        # 无效ID告警阈值（条/10分钟）
ALERT_EMAIL_ENABLED=true             # 是否发送邮件告警
ALERT_MESSAGE_ENABLED=true           # 是否发送站内信告警
ALERT_RECIPIENTS=admin@example.com   # 告警接收者邮箱（逗号分隔）
EXCEPTION_CHECK_INTERVAL_MINUTES=10  # 异常监控检查间隔（分钟）
```

### 备份任务监控配置

```bash
# 备份任务监控
BACKUP_MONITORING_ENABLED=true       # 是否启用备份任务监控
BACKUP_TIMEOUT_HOURS=2               # 备份任务超时阈值（小时）
ARCHIVE_AGE_THRESHOLD_HOURS=48       # 归档数据过期阈值（小时）
BACKUP_CHECK_INTERVAL_HOURS=1        # 备份任务监控检查间隔（小时）
ALERT_ON_BACKUP_FAILURE=true         # 是否在备份失败时发送告警
NOTIFY_ON_BACKUP_SUCCESS=false       # 是否在备份成功时发送通知
```

### 告警规则配置

```bash
# 告警规则
ALERT_RULE_LOG_RECORDING_ERROR_ENABLED=true      # 日志记录异常告警
ALERT_RULE_LOG_RECORDING_ERROR_LEVEL=error       # 告警级别
ALERT_RULE_LOG_QUERY_ERROR_ENABLED=true          # 日志查询异常告警
ALERT_RULE_LOG_QUERY_ERROR_LEVEL=error           # 告警级别
ALERT_RULE_LOG_EXPORT_ERROR_ENABLED=true         # 日志导出异常告警
ALERT_RULE_LOG_EXPORT_ERROR_LEVEL=error          # 告警级别
ALERT_RULE_INVALID_ID_WARNING_ENABLED=true       # 无效ID告警
ALERT_RULE_INVALID_ID_WARNING_LEVEL=warning      # 告警级别
ALERT_RULE_UNKNOWN_MODULE_WARNING_ENABLED=true   # 未知模块告警
ALERT_RULE_UNKNOWN_MODULE_WARNING_LEVEL=warning  # 告警级别
ALERT_RULE_DATABASE_CONNECTION_FAILED_ENABLED=true  # 数据库连接失败告警
ALERT_RULE_DATABASE_CONNECTION_FAILED_LEVEL=critical  # 告警级别
```

## 生产环境部署检查清单

### 1. 数据库配置
- [ ] 根据服务器性能调整连接池大小
- [ ] 配置合理的超时时间
- [ ] 验证数据库连接字符串

### 2. Redis 配置
- [ ] 配置 Redis 密码
- [ ] 根据业务需求调整缓存 TTL
- [ ] 验证 Redis 连接

### 3. 邮件服务配置
- [ ] 配置 SMTP 服务器地址和端口
- [ ] 配置 SMTP 用户名和密码
- [ ] 配置告警接收者邮箱列表
- [ ] 测试邮件发送功能

### 4. 备份配置
- [ ] 启用自动备份
- [ ] 配置备份定时任务
- [ ] 配置备份保留天数
- [ ] 验证备份存储路径

### 5. 监控配置
- [ ] 启用性能监控
- [ ] 配置合理的阈值
- [ ] 启用异常告警
- [ ] 配置告警接收者

### 6. 安全配置
- [ ] 修改所有默认密码
- [ ] 使用强密码（至少 16 位）
- [ ] 配置 TLS/SSL 加密
- [ ] 限制配置文件访问权限

### 7. 测试验证
- [ ] 测试数据库连接
- [ ] 测试 Redis 连接
- [ ] 测试邮件发送
- [ ] 测试备份任务
- [ ] 测试告警功能

## 配置验证

系统提供了配置验证函数，可以在启动时自动验证配置的完整性和合理性：

```typescript
import {
  validateProductionConfig,
  validateDatabasePoolConfig,
  validateRedisCacheConfig,
  validateEmailServiceConfig,
  validateAllMonitoringConfigs,
} from './config';

// 验证所有配置
try {
  validateProductionConfig();
  validateDatabasePoolConfig();
  validateRedisCacheConfig();
  validateEmailServiceConfig();
  validateAllMonitoringConfigs();
  console.log('配置验证通过');
} catch (error) {
  console.error('配置验证失败:', error.message);
  process.exit(1);
}
```

## 常见问题

### 1. 数据库连接池配置建议

**问题**: 如何确定合适的连接池大小？

**答案**:
- 开发环境: 10-20 个连接
- 小型生产环境: 50-100 个连接
- 大型生产环境: 100-200 个连接
- 根据公式: `连接数 = ((核心数 * 2) + 有效磁盘数)`

### 2. Redis 缓存 TTL 配置建议

**问题**: 如何设置合理的缓存 TTL？

**答案**:
- 频繁变化的数据: 5-10 分钟
- 较少变化的数据: 30-60 分钟
- 基本不变的数据: 1-2 小时
- 根据业务需求和数据更新频率调整

### 3. 邮件服务配置问题

**问题**: 邮件发送失败怎么办？

**答案**:
1. 检查 SMTP 服务器地址和端口
2. 检查用户名和密码（某些邮箱需要授权码）
3. 检查 TLS/SSL 配置
4. 检查防火墙和网络连接
5. 查看邮件服务器日志

### 4. 监控告警配置建议

**问题**: 如何避免告警过多？

**答案**:
1. 配置合理的阈值
2. 启用告警去重机制
3. 根据业务重要性设置告警级别
4. 定期审查和调整告警规则

## 参考资料

- [Prisma 连接池配置](https://www.prisma.io/docs/concepts/components/prisma-client/connection-management)
- [Redis 配置最佳实践](https://redis.io/docs/management/config/)
- [NestJS 配置模块](https://docs.nestjs.com/techniques/configuration)
- [SMTP 配置指南](https://nodemailer.com/smtp/)

## 更新日志

### 2024-01-XX
- 初始版本
- 添加数据库连接池配置
- 添加 Redis 缓存配置
- 添加邮件服务配置
- 添加监控和告警配置
