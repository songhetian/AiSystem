import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { SystemMessagesService } from "./system-messages.service";

/**
 * 日志异常告警类型
 * Requirements: 22.1, 22.2, 22.3, 22.4
 */
export enum LogAlertType {
  /** 日志记录异常 */
  LOG_RECORDING_ERROR = "log_recording_error",
  /** 日志查询异常 */
  LOG_QUERY_ERROR = "log_query_error",
  /** 日志导出异常 */
  LOG_EXPORT_ERROR = "log_export_error",
  /** 无效ID告警 */
  INVALID_ID_WARNING = "invalid_id_warning",
  /** 未知模块告警 */
  UNKNOWN_MODULE_WARNING = "unknown_module_warning",
  /** 操作结果未返回 */
  OPERATION_RESULT_MISSING = "operation_result_missing",
  /** 时间戳异常 */
  TIMESTAMP_ABNORMAL = "timestamp_abnormal",
  /** 数据库连接失败 */
  DATABASE_CONNECTION_FAILED = "database_connection_failed",
}

/**
 * 告警级别
 */
export enum AlertLevel {
  /** 信息 */
  INFO = "info",
  /** 警告 */
  WARNING = "warning",
  /** 错误 */
  ERROR = "error",
  /** 严重 */
  CRITICAL = "critical",
}

/**
 * 告警数据接口
 */
export interface LogAlertData {
  /** 告警类型 */
  type: LogAlertType;
  /** 告警级别 */
  level: AlertLevel;
  /** 告警标题 */
  title: string;
  /** 告警消息 */
  message: string;
  /** 告警详情 */
  details?: Record<string, any>;
  /** 关联的用户ID（可选） */
  userId?: string;
  /** 关联的平台ID（可选） */
  platformId?: string;
  /** 关联的部门ID（可选） */
  deptId?: string;
}

/**
 * 日志异常告警服务
 * Requirements: 22.1, 22.2, 22.3, 22.4
 *
 * 职责：
 * 1. 实现日志记录异常告警
 * 2. 实现日志查询异常告警
 * 3. 实现导出异常告警
 * 4. 实现无效 ID 告警
 * 5. 实现未知模块告警
 * 6. 集成邮件和后端通知渠道
 * 7. 实现告警去重机制（1小时内相同告警仅触发一次）
 */
@Injectable()
export class LogAlertService {
  private readonly logger = new Logger(LogAlertService.name);

  /**
   * 告警去重缓存
   * Key: 告警类型 + 告警消息的哈希
   * Value: 最后触发时间戳
   */
  private alertCache = new Map<string, number>();

  /**
   * 告警去重时间窗口（毫秒）
   * 默认 1 小时
   */
  private readonly DEDUP_WINDOW_MS = 3600000; // 1 hour

  constructor(
    private readonly prisma: PrismaService,
    private readonly messagesService: SystemMessagesService,
  ) {}

  /**
   * 触发日志告警
   * Requirements: 22.1, 22.2, 22.3, 22.4
   *
   * @param alertData 告警数据
   */
  async triggerAlert(alertData: LogAlertData): Promise<void> {
    try {
      // 1. 告警去重检查
      const cacheKey = this.generateCacheKey(alertData);
      if (this.isDuplicate(cacheKey)) {
        this.logger.debug(
          `Alert deduplicated: ${alertData.type} - ${alertData.title}`,
        );
        return;
      }

      // 2. 记录告警到缓存
      this.alertCache.set(cacheKey, Date.now());

      // 3. 记录告警日志
      this.logger.warn(
        `[LOG ALERT] ${alertData.level.toUpperCase()} - ${alertData.title}: ${alertData.message}`,
        alertData.details,
      );

      // 4. 持久化告警记录到数据库
      await this.persistAlert(alertData);

      // 5. 发送通知给管理员
      await this.sendNotifications(alertData);
    } catch (error) {
      // 告警系统本身不应该抛出异常，避免影响主业务
      this.logger.error(
        `Failed to trigger alert: ${error instanceof Error ? error.message : String(error)}`,
        error instanceof Error ? error.stack : undefined,
      );
    }
  }

  /**
   * 日志记录异常告警
   * Requirements: 22.1
   *
   * @param error 错误对象
   * @param context 上下文信息
   */
  async alertLogRecordingError(
    error: Error,
    context: {
      logType: "operation" | "login";
      userId?: string;
      platformId?: string;
      deptId?: string;
    },
  ): Promise<void> {
    await this.triggerAlert({
      type: LogAlertType.LOG_RECORDING_ERROR,
      level: AlertLevel.ERROR,
      title: "日志记录异常",
      message: `${context.logType === "operation" ? "操作" : "登录"}日志记录失败`,
      details: {
        errorMessage: error.message,
        errorStack: error.stack,
        logType: context.logType,
        userId: context.userId,
        platformId: context.platformId,
        deptId: context.deptId,
      },
      userId: context.userId,
      platformId: context.platformId,
      deptId: context.deptId,
    });
  }

  /**
   * 日志查询异常告警
   * Requirements: 22.2
   *
   * @param error 错误对象
   * @param context 上下文信息
   */
  async alertLogQueryError(
    error: Error,
    context: {
      logType: "operation" | "login";
      userId?: string;
      query?: any;
    },
  ): Promise<void> {
    await this.triggerAlert({
      type: LogAlertType.LOG_QUERY_ERROR,
      level: AlertLevel.ERROR,
      title: "日志查询异常",
      message: `${context.logType === "operation" ? "操作" : "登录"}日志查询失败`,
      details: {
        errorMessage: error.message,
        errorStack: error.stack,
        logType: context.logType,
        userId: context.userId,
        query: context.query,
      },
      userId: context.userId,
    });
  }

  /**
   * 日志导出异常告警
   * Requirements: 22.3
   *
   * @param error 错误对象
   * @param context 上下文信息
   */
  async alertLogExportError(
    error: Error,
    context: {
      logType: "operation" | "login";
      userId?: string;
      exportCount?: number;
    },
  ): Promise<void> {
    await this.triggerAlert({
      type: LogAlertType.LOG_EXPORT_ERROR,
      level: AlertLevel.ERROR,
      title: "日志导出异常",
      message: `${context.logType === "operation" ? "操作" : "登录"}日志导出失败`,
      details: {
        errorMessage: error.message,
        errorStack: error.stack,
        logType: context.logType,
        userId: context.userId,
        exportCount: context.exportCount,
      },
      userId: context.userId,
    });
  }

  /**
   * 无效ID告警
   * Requirements: 22.4
   *
   * @param context 上下文信息
   */
  async alertInvalidId(context: {
    idType: "user" | "platform" | "department" | "shop";
    invalidId: string;
    logType?: "operation" | "login";
    logId?: string;
  }): Promise<void> {
    const idTypeNames = {
      user: "用户",
      platform: "平台",
      department: "部门",
      shop: "店铺",
    };

    await this.triggerAlert({
      type: LogAlertType.INVALID_ID_WARNING,
      level: AlertLevel.WARNING,
      title: "无效ID告警",
      message: `检测到无效的${idTypeNames[context.idType]}ID: ${context.invalidId}`,
      details: {
        idType: context.idType,
        invalidId: context.invalidId,
        logType: context.logType,
        logId: context.logId,
      },
    });
  }

  /**
   * 未知模块告警
   * Requirements: 22.4
   *
   * @param context 上下文信息
   */
  async alertUnknownModule(context: {
    moduleName: string;
    apiPath: string;
    userId?: string;
  }): Promise<void> {
    await this.triggerAlert({
      type: LogAlertType.UNKNOWN_MODULE_WARNING,
      level: AlertLevel.WARNING,
      title: "未知模块告警",
      message: `检测到未知的操作模块: ${context.moduleName}`,
      details: {
        moduleName: context.moduleName,
        apiPath: context.apiPath,
        userId: context.userId,
      },
      userId: context.userId,
    });
  }

  /**
   * 操作结果未返回告警
   * Requirements: 22.1
   *
   * @param context 上下文信息
   */
  async alertOperationResultMissing(context: {
    apiPath: string;
    userId?: string;
    platformId?: string;
  }): Promise<void> {
    await this.triggerAlert({
      type: LogAlertType.OPERATION_RESULT_MISSING,
      level: AlertLevel.WARNING,
      title: "操作结果未返回",
      message: `操作异常（未返回结果）: ${context.apiPath}`,
      details: {
        apiPath: context.apiPath,
        userId: context.userId,
        platformId: context.platformId,
      },
      userId: context.userId,
      platformId: context.platformId,
    });
  }

  /**
   * 时间戳异常告警
   * Requirements: 22.1
   *
   * @param context 上下文信息
   */
  async alertTimestampAbnormal(context: {
    logType: "operation" | "login";
    originalTimestamp?: Date;
    correctedTimestamp: Date;
    userId?: string;
  }): Promise<void> {
    await this.triggerAlert({
      type: LogAlertType.TIMESTAMP_ABNORMAL,
      level: AlertLevel.INFO,
      title: "时间戳异常",
      message: `${context.logType === "operation" ? "操作" : "登录"}日志时间戳异常，已自动修正`,
      details: {
        logType: context.logType,
        originalTimestamp: context.originalTimestamp,
        correctedTimestamp: context.correctedTimestamp,
        userId: context.userId,
      },
      userId: context.userId,
    });
  }

  /**
   * 数据库连接失败告警
   * Requirements: 22.1
   *
   * @param error 错误对象
   */
  async alertDatabaseConnectionFailed(error: Error): Promise<void> {
    await this.triggerAlert({
      type: LogAlertType.DATABASE_CONNECTION_FAILED,
      level: AlertLevel.CRITICAL,
      title: "数据库连接失败",
      message: "日志系统数据库连接失败，日志已缓存到本地",
      details: {
        errorMessage: error.message,
        errorStack: error.stack,
      },
    });
  }

  /**
   * 生成告警缓存键
   * 用于告警去重
   *
   * @param alertData 告警数据
   * @returns 缓存键
   */
  private generateCacheKey(alertData: LogAlertData): string {
    // 使用告警类型 + 消息的简单哈希作为缓存键
    const baseKey = `${alertData.type}:${alertData.message}`;

    // 对于某些告警类型，添加额外的上下文以避免过度去重
    if (alertData.type === LogAlertType.INVALID_ID_WARNING && alertData.details?.invalidId) {
      return `${baseKey}:${alertData.details.invalidId}`;
    }

    if (alertData.type === LogAlertType.UNKNOWN_MODULE_WARNING && alertData.details?.moduleName) {
      return `${baseKey}:${alertData.details.moduleName}`;
    }

    return baseKey;
  }

  /**
   * 检查告警是否重复
   * Requirements: 22.1, 22.2
   *
   * @param cacheKey 缓存键
   * @returns 是否重复
   */
  private isDuplicate(cacheKey: string): boolean {
    const lastTriggerTime = this.alertCache.get(cacheKey);
    if (!lastTriggerTime) {
      return false;
    }

    const now = Date.now();
    const timeSinceLastTrigger = now - lastTriggerTime;

    // 如果距离上次触发时间超过去重窗口，则不是重复
    if (timeSinceLastTrigger > this.DEDUP_WINDOW_MS) {
      return false;
    }

    return true;
  }

  /**
   * 持久化告警记录到数据库
   * Requirements: 22.1, 22.2, 22.3, 22.4
   *
   * @param alertData 告警数据
   */
  private async persistAlert(alertData: LogAlertData): Promise<void> {
    try {
      await this.prisma.sys_log_alert.create({
        data: {
          alert_type: alertData.type,
          alert_level: alertData.level,
          alert_title: alertData.title,
          alert_message: alertData.message,
          alert_details: alertData.details ? JSON.stringify(alertData.details) : null,
          user_id: alertData.userId || null,
          platform_id: alertData.platformId || null,
          dept_id: alertData.deptId || null,
          is_resolved: 0,
        },
      });
    } catch (error) {
      // 持久化失败不应该影响告警流程
      this.logger.error(
        `Failed to persist alert: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 发送通知给管理员
   * Requirements: 22.3, 22.4
   *
   * 通知渠道：
   * 1. 站内信（系统消息）
   * 2. 邮件（通过消息模板系统）
   *
   * @param alertData 告警数据
   */
  private async sendNotifications(alertData: LogAlertData): Promise<void> {
    try {
      // 1. 获取需要接收告警的管理员列表
      const adminUsers = await this.getAlertRecipients(alertData);

      if (adminUsers.length === 0) {
        this.logger.warn("No admin users found to receive alert notifications");
        return;
      }

      // 2. 确定消息类型和模板
      const messageType = this.getMessageType(alertData.level);
      const templateName = this.getTemplateName(alertData.type);

      // 3. 发送站内信给每个管理员
      for (const admin of adminUsers) {
        try {
          await this.messagesService.sendFromTemplate({
            templateName,
            recipientId: admin.id,
            variables: {
              alertTitle: alertData.title,
              alertMessage: alertData.message,
              alertLevel: this.getAlertLevelText(alertData.level),
              alertTime: new Date().toLocaleString("zh-CN"),
              alertDetails: alertData.details
                ? JSON.stringify(alertData.details, null, 2)
                : "无",
            },
            senderId: "SYSTEM",
          });
        } catch (error) {
          this.logger.error(
            `Failed to send notification to admin ${admin.id}: ${error instanceof Error ? error.message : String(error)}`,
          );
        }
      }
    } catch (error) {
      // 发送通知失败不应该影响告警流程
      this.logger.error(
        `Failed to send notifications: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
  }

  /**
   * 获取告警接收者列表
   * Requirements: 22.3, 22.4
   *
   * 规则：
   * 1. 超级管理员（super_admin）接收所有告警
   * 2. 审计员（auditor）接收所有告警
   * 3. 如果告警关联了平台/部门，则通知该平台/部门的管理员
   *
   * @param alertData 告警数据
   * @returns 管理员用户列表
   */
  private async getAlertRecipients(
    alertData: LogAlertData,
  ): Promise<Array<{ id: string; username: string }>> {
    try {
      // 查询超级管理员和审计员
      const adminRoles = await this.prisma.sys_role.findMany({
        where: {
          role_code: {
            in: ["super_admin", "auditor"],
          },
          is_deleted: 0,
        },
        select: {
          id: true,
        },
      });

      const adminRoleIds = adminRoles.map((role) => role.id);

      // 查询拥有这些角色的用户
      const adminUserRoles = await this.prisma.sys_user_role.findMany({
        where: {
          role_id: {
            in: adminRoleIds,
          },
        },
        select: {
          user_id: true,
        },
      });

      const adminUserIds = [...new Set(adminUserRoles.map((ur) => ur.user_id))];

      // 获取用户详情
      const adminUsers = await this.prisma.sys_user.findMany({
        where: {
          id: {
            in: adminUserIds,
          },
          is_deleted: 0,
          status: 1, // 仅通知启用状态的用户
        },
        select: {
          id: true,
          username: true,
        },
      });

      return adminUsers;
    } catch (error) {
      this.logger.error(
        `Failed to get alert recipients: ${error instanceof Error ? error.message : String(error)}`,
      );
      return [];
    }
  }

  /**
   * 获取消息类型
   *
   * @param level 告警级别
   * @returns 消息类型
   */
  private getMessageType(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.CRITICAL:
      case AlertLevel.ERROR:
        return "system_alert";
      case AlertLevel.WARNING:
        return "system_notice";
      case AlertLevel.INFO:
      default:
        return "system_info";
    }
  }

  /**
   * 获取模板名称
   *
   * @param alertType 告警类型
   * @returns 模板名称
   */
  private getTemplateName(alertType: LogAlertType): string {
    // 使用通用的系统告警模板
    // 如果需要针对不同告警类型使用不同模板，可以在这里扩展
    return "系统告警通知";
  }

  /**
   * 获取告警级别文本
   *
   * @param level 告警级别
   * @returns 告警级别文本
   */
  private getAlertLevelText(level: AlertLevel): string {
    switch (level) {
      case AlertLevel.CRITICAL:
        return "严重";
      case AlertLevel.ERROR:
        return "错误";
      case AlertLevel.WARNING:
        return "警告";
      case AlertLevel.INFO:
        return "信息";
      default:
        return "未知";
    }
  }

  /**
   * 清理过期的告警缓存
   * 定期调用此方法以释放内存
   */
  cleanupExpiredCache(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    for (const [key, timestamp] of this.alertCache.entries()) {
      if (now - timestamp > this.DEDUP_WINDOW_MS) {
        expiredKeys.push(key);
      }
    }

    for (const key of expiredKeys) {
      this.alertCache.delete(key);
    }

    if (expiredKeys.length > 0) {
      this.logger.debug(`Cleaned up ${expiredKeys.length} expired alert cache entries`);
    }
  }
}
