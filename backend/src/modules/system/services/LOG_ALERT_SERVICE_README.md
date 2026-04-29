# LogAlertService - 日志异常告警服务

## 概述

LogAlertService 是系统日志管理系统的告警服务，负责在日志记录、查询、导出等操作出现异常时触发告警，并通知相关管理员。

## 功能特性

### 1. 告警类型 (LogAlertType)

- **LOG_RECORDING_ERROR**: 日志记录异常
- **LOG_QUERY_ERROR**: 日志查询异常
- **LOG_EXPORT_ERROR**: 日志导出异常
- **INVALID_ID_WARNING**: 无效ID告警
- **UNKNOWN_MODULE_WARNING**: 未知模块告警
- **OPERATION_RESULT_MISSING**: 操作结果未返回
- **TIMESTAMP_ABNORMAL**: 时间戳异常
- **DATABASE_CONNECTION_FAILED**: 数据库连接失败

### 2. 告警级别 (AlertLevel)

- **INFO**: 信息级别
- **WARNING**: 警告级别
- **ERROR**: 错误级别
- **CRITICAL**: 严重级别

### 3. 核心功能

#### 3.1 告警触发

```typescript
await logAlertService.triggerAlert({
  type: LogAlertType.LOG_RECORDING_ERROR,
  level: AlertLevel.ERROR,
  title: "日志记录异常",
  message: "操作日志记录失败",
  details: { errorMessage: "Database connection failed" },
  userId: "user-123",
  platformId: "platform-123",
});
```

#### 3.2 告警去重

- 相同告警在1小时内仅触发一次
- 基于告警类型和消息内容进行去重
- 自动清理过期的缓存条目

#### 3.3 通知机制

- 自动通知超级管理员（super_admin）和审计员（auditor）
- 通过站内信系统发送通知
- 支持邮件通知（通过消息模板系统）

#### 3.4 持久化

- 所有告警记录持久化到 `sys_log_alert` 表
- 记录告警详情、关联用户、平台、部门等信息
- 支持告警解决状态跟踪

## 使用方法

### 1. 日志记录异常告警

```typescript
try {
  // 日志记录逻辑
} catch (error) {
  await logAlertService.alertLogRecordingError(error, {
    logType: "operation",
    userId: user.sub,
    platformId: user.platform_id,
    deptId: user.dept_id,
  });
}
```

### 2. 日志查询异常告警

```typescript
try {
  // 日志查询逻辑
} catch (error) {
  await logAlertService.alertLogQueryError(error, {
    logType: "operation",
    userId: user.sub,
    query: queryDto,
  });
}
```

### 3. 日志导出异常告警

```typescript
try {
  // 日志导出逻辑
} catch (error) {
  await logAlertService.alertLogExportError(error, {
    logType: "operation",
    userId: user.sub,
    exportCount: totalCount,
  });
}
```

### 4. 无效ID告警

```typescript
if (!user) {
  await logAlertService.alertInvalidId({
    idType: "user",
    invalidId: userId,
    logType: "operation",
    logId: logEntry.id,
  });
}
```

### 5. 未知模块告警

```typescript
if (!knownModules.includes(moduleName)) {
  await logAlertService.alertUnknownModule({
    moduleName,
    apiPath: request.path,
    userId: user.sub,
  });
}
```

### 6. 操作结果未返回告警

```typescript
if (!operationResult) {
  await logAlertService.alertOperationResultMissing({
    apiPath: request.path,
    userId: user.sub,
    platformId: user.platform_id,
  });
}
```

### 7. 时间戳异常告警

```typescript
if (isTimestampInvalid(timestamp)) {
  const correctedTimestamp = new Date();
  await logAlertService.alertTimestampAbnormal({
    logType: "operation",
    originalTimestamp: timestamp,
    correctedTimestamp,
    userId: user.sub,
  });
}
```

### 8. 数据库连接失败告警

```typescript
try {
  // 数据库操作
} catch (error) {
  if (isDatabaseConnectionError(error)) {
    await logAlertService.alertDatabaseConnectionFailed(error);
  }
}
```

## 数据库迁移

### 创建 sys_log_alert 表

运行以下命令创建数据库迁移：

```bash
cd backend
npx prisma migrate dev --name add_sys_log_alert_table
```

或者手动执行以下 SQL：

```sql
CREATE TABLE `sys_log_alert` (
  `id` VARCHAR(191) NOT NULL,
  `create_time` DATETIME(3) NOT NULL DEFAULT CURRENT_TIMESTAMP(3),
  `update_time` DATETIME(3) NOT NULL,
  `is_deleted` INTEGER NOT NULL DEFAULT 0,
  `alert_type` VARCHAR(100) NOT NULL,
  `alert_level` VARCHAR(20) NOT NULL,
  `alert_title` VARCHAR(200) NOT NULL,
  `alert_message` TEXT NOT NULL,
  `alert_details` TEXT NULL,
  `user_id` VARCHAR(50) NULL,
  `platform_id` VARCHAR(50) NULL,
  `dept_id` VARCHAR(50) NULL,
  `is_resolved` INTEGER NOT NULL DEFAULT 0,
  `resolved_time` DATETIME(3) NULL,
  `resolved_by` VARCHAR(50) NULL,

  PRIMARY KEY (`id`),
  INDEX `sys_log_alert_alert_type_create_time_idx`(`alert_type`, `create_time`),
  INDEX `sys_log_alert_alert_level_is_resolved_idx`(`alert_level`, `is_resolved`),
  INDEX `sys_log_alert_platform_id_dept_id_idx`(`platform_id`, `dept_id`),
  INDEX `sys_log_alert_user_id_idx`(`user_id`),
  INDEX `sys_log_alert_create_time_idx`(`create_time`)
) DEFAULT CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

## 消息模板配置

### 创建系统告警通知模板

需要在 `sys_message_template` 表中创建以下模板：

```sql
INSERT INTO `sys_message_template` (
  `id`,
  `name`,
  `tpl_type`,
  `content`,
  `channels`,
  `status`,
  `create_time`,
  `update_time`
) VALUES (
  'tpl_system_alert',
  '系统告警通知',
  'system_alert',
  '【系统告警】\n\n告警级别：{{alertLevel}}\n告警标题：{{alertTitle}}\n告警消息：{{alertMessage}}\n告警时间：{{alertTime}}\n\n详细信息：\n{{alertDetails}}\n\n请及时处理。',
  'system,email',
  1,
  NOW(),
  NOW()
);
```

## 定期维护

### 清理过期缓存

建议定期调用 `cleanupExpiredCache()` 方法清理过期的告警缓存：

```typescript
// 在定时任务中调用
@Cron('0 0 * * *') // 每天凌晨执行
async cleanupAlertCache() {
  this.logAlertService.cleanupExpiredCache();
}
```

## 测试

运行单元测试：

```bash
cd backend
npm test -- log-alert.service.spec.ts
```

测试覆盖：
- ✅ 告警触发和持久化
- ✅ 告警通知发送
- ✅ 告警去重机制
- ✅ 各种告警类型
- ✅ 错误处理
- ✅ 缓存清理

## 需求覆盖

本服务实现了以下需求：

- **Requirement 22.1**: 日志记录异常告警
- **Requirement 22.2**: 日志查询异常告警
- **Requirement 22.3**: 日志导出异常告警
- **Requirement 22.4**: 无效ID和未知模块告警

## 注意事项

1. **非阻塞设计**: 告警服务不会抛出异常，避免影响主业务流程
2. **去重机制**: 相同告警在1小时内仅触发一次，避免告警风暴
3. **异步处理**: 告警通知异步发送，不阻塞主流程
4. **容错性**: 持久化或通知失败不会影响告警记录
5. **权限控制**: 仅通知超级管理员和审计员

## 集成示例

### 在 SystemLogsService 中集成

```typescript
import { LogAlertService } from './log-alert.service';

@Injectable()
export class SystemLogsService {
  constructor(
    private readonly logAlertService: LogAlertService,
  ) {}

  async listOperationLogs(user: CurrentUserPayload, query: QuerySystemLogsDto) {
    try {
      // 查询逻辑
    } catch (error) {
      // 触发告警
      await this.logAlertService.alertLogQueryError(error, {
        logType: 'operation',
        userId: user.sub,
        query,
      });
      throw error;
    }
  }
}
```

## 未来扩展

1. **告警聚合**: 支持按时间窗口聚合相似告警
2. **告警升级**: 支持告警升级机制（未处理的告警自动升级）
3. **告警统计**: 提供告警统计和分析功能
4. **自定义通知渠道**: 支持更多通知渠道（钉钉、企业微信等）
5. **告警规则配置**: 支持动态配置告警规则和阈值
