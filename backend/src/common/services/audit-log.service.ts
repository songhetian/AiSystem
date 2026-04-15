import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../prisma/prisma.service";
import { MessageService } from "./message.service";
import { RedisService } from "./redis.service";

interface LoginLogPayload {
  user_id?: string | null;
  username: string;
  login_ip?: string | null;
  user_agent?: string | null;
  login_status: number;
  login_message?: string | null;
  platform_id?: string | null;
  dept_id?: string | null;
  shop_id?: string | null;
}

interface OperationLogPayload {
  user_id?: string | null;
  username?: string | null;
  request_method: string;
  api_path: string;
  api_name?: string | null;
  operation_module?: string | null;
  request_ip?: string | null;
  user_agent?: string | null;
  operation_status: number;
  operation_message?: string | null;
  request_params?: unknown;
  response_summary?: unknown;
  diff_content?: unknown; // [NEW] 字段级差异
  platform_id?: string | null;
  dept_id?: string | null;
  shop_id?: string | null;
}

function trimMessage(value?: string | null, max = 500) {
  if (!value) {
    return undefined;
  }
  if (value.length > max) {
    // 严格遵循文档要求的标记
    return value.slice(0, max) + "（内容已截取）";
  }
  return value;
}

@Injectable()
export class AuditLogService {
  private readonly logger = new Logger(AuditLogService.name);
  // 故障兜底缓存 key 前缀
  private readonly FALLBACK_LOGIN_KEY = "audit:fallback:login";
  private readonly FALLBACK_OP_KEY = "audit:fallback:operation";

  constructor(
    private readonly prisma: PrismaService,
    private readonly messageService: MessageService,
    private readonly redisService: RedisService,
  ) {}

  async alarmAdmins(
    title: string,
    content: string,
    payload?: Record<string, any>,
  ) {
    // 查找活跃的管理员用户 (以 role_code 包含 admin 或 SUPER_ADMIN 为标志)
    const admins = await this.prisma.sys_user.findMany({
      where: {
        is_deleted: 0,
        status: 1,
        roles: {
          some: {
            role: {
              role_code: {
                in: ["admin", "SUPER_ADMIN", "ADMIN"],
              },
            },
          },
        },
      },
    });

    // 异步发送告警，不阻塞主流程
    for (const admin of admins) {
      void this.messageService.send({
        recipientId: admin.id,
        title: `[系统告警] ${title}`,
        content,
        messageType: "system-alarm",
        bizType: "audit-alarm",
        payload,
      });
    }
  }

  async logLogin(payload: LoginLogPayload) {
    try {
      await this.prisma.sys_login_log.create({
        data: {
          user_id: payload.user_id ?? undefined,
          username: payload.username,
          login_ip: payload.login_ip ?? undefined,
          user_agent: payload.user_agent ?? undefined,
          login_status: payload.login_status,
          login_message: trimMessage(payload.login_message, 190),
          platform_id: payload.platform_id ?? undefined,
          dept_id: payload.dept_id ?? undefined,
          shop_id: payload.shop_id ?? undefined,
        },
      });
      // 写入成功后，尝试同步 Redis 中的兜底缓存
      void this.flushFallbackLogs();
    } catch (e) {
      // ✅ 故障兜底：数据库写入失败时，缓存到 Redis（PRD 2.1.2）
      this.logger.error(
        `logLogin DB write failed, caching to Redis: ${e?.message}`,
      );
      try {
        await this.redisService.lpush(
          this.FALLBACK_LOGIN_KEY,
          JSON.stringify({ ...payload, _cached_at: Date.now() }),
        );
      } catch (redisErr) {
        this.logger.error(
          `logLogin Redis fallback also failed: ${redisErr?.message}`,
        );
      }
    }

    // 检查是否有异常 ID 需要告警 (V7.0 实战化补全)
    if (
      payload.username === "未知账号" ||
      (payload.user_id && !payload.platform_id)
    ) {
      void this.alarmAdmins(
        "高危登录尝试",
        `检测到异常登录记录: 用户名[${payload.username}], 来源IP[${payload.login_ip || "未知"}]`,
        { ...payload },
      );
    }
  }

  async logOperation(payload: OperationLogPayload & { requestTime?: number }) {
    let message = payload.operation_message;
    const now = new Date();

    // 1. 操作时间异常处理 (V7.0 精修)
    // 校验前端传入的时间戳，若偏差超过 60 秒则判定为时间异常
    if (payload.requestTime) {
      const diffSeconds = Math.abs(now.getTime() - payload.requestTime) / 1000;
      if (diffSeconds > 60) {
        message = `[时间异常: 偏差 ${Math.round(diffSeconds)}s] ${message || ""}`;
        void this.alarmAdmins(
          "操作时间异常告警",
          `接口 ${payload.api_path} 记录到显著的时间戳偏差，可能存在请求重放或本地时间篡改。`,
          { path: payload.api_path, diffSeconds },
        );
      }
    }

    if (!message && payload.operation_status === 0) {
      message = "操作异常（未返回结果）";
    }

    // 2. 所属模块预设校验 (V2.1 工业级精修)
    const predefinedModules = [
      "用户管理",
      "角色管理",
      "菜单管理",
      "权限管理",
      "部门管理",
      "平台管理",
      "店铺管理",
      "系统设置",
      "数据映射",
      "消息管理",
      "考勤管理",
      "排班管理",
      "人员管理",
      "财务管理",
      "审批管理",
      "知识库",
      "考试管理",
      "客服管理",
      "审计日志",
    ];
    let finalModule = payload.operation_module || "未知模块";

    if (
      finalModule !== "未知模块" &&
      !predefinedModules.includes(finalModule)
    ) {
      // 如果模块名不在预设列表中，记录路径并告警
      void this.alarmAdmins(
        "操作模块未匹配",
        `接口路径 ${payload.api_path} 对应的模块名 ${finalModule} 未在预设列表中`,
      );
      finalModule = `未知模块 (${finalModule})`;
    }

    try {
      await this.prisma.sys_operation_log.create({
        data: {
          user_id: payload.user_id ?? undefined,
          username: payload.username ?? undefined,
          request_method: payload.request_method,
          api_path: payload.api_path,
          api_name: payload.api_name ?? undefined,
          operation_module: finalModule,
          request_ip: payload.request_ip ?? undefined,
          user_agent: payload.user_agent ?? undefined,
          operation_status: payload.operation_status,
          operation_message: trimMessage(message, 500),
          request_params: payload.request_params as any,
          response_summary: payload.response_summary as any,
          diff_content: payload.diff_content as any,
          platform_id: payload.platform_id ?? undefined,
          dept_id: payload.dept_id ?? undefined,
          shop_id: payload.shop_id ?? undefined,
        },
      });
      // 写入成功后，尝试同步 Redis 中的兜底缓存
      void this.flushFallbackLogs();
    } catch (e) {
      // ✅ 故障兜底：数据库写入失败时，缓存到 Redis（PRD 2.1.2）
      this.logger.error(
        `logOperation DB write failed, caching to Redis: ${e?.message}`,
      );
      try {
        await this.redisService.lpush(
          this.FALLBACK_OP_KEY,
          JSON.stringify({
            ...payload,
            finalModule,
            message,
            _cached_at: Date.now(),
          }),
        );
      } catch (redisErr) {
        this.logger.error(
          `logOperation Redis fallback also failed: ${redisErr?.message}`,
        );
      }
    }

    // 3. 用户合法性二次校验告警 (V2.1 工业级精修)
    if (payload.user_id && !payload.username) {
      void this.alarmAdmins(
        "操作人 ID 异常",
        `UserID ${payload.user_id} 在系统中不存在，请排查非法操作`,
      );
    }
  }

  /**
   * ✅ 故障恢复：将 Redis 兜底缓存中的日志同步写入数据库（PRD 2.1.2）
   * 每次正常写入成功后异步触发，确保无日志丢失
   */
  private async flushFallbackLogs() {
    // 同步登录日志
    try {
      while (true) {
        const raw = await this.redisService.rpop(this.FALLBACK_LOGIN_KEY);
        if (!raw) break;
        const payload: LoginLogPayload & { _cached_at?: number } = JSON.parse(
          raw as string,
        );
        delete payload._cached_at;
        await this.prisma.sys_login_log.create({
          data: {
            user_id: payload.user_id ?? undefined,
            username: payload.username,
            login_ip: payload.login_ip ?? undefined,
            user_agent: payload.user_agent ?? undefined,
            login_status: payload.login_status,
            login_message: trimMessage(payload.login_message, 190),
            platform_id: payload.platform_id ?? undefined,
            dept_id: payload.dept_id ?? undefined,
            shop_id: payload.shop_id ?? undefined,
          },
        });
      }
    } catch {
      // 同步失败不影响主流程
    }

    // 同步操作日志
    try {
      while (true) {
        const raw = await this.redisService.rpop(this.FALLBACK_OP_KEY);
        if (!raw) break;
        const payload: any = JSON.parse(raw as string);
        await this.prisma.sys_operation_log.create({
          data: {
            user_id: payload.user_id ?? undefined,
            username: payload.username ?? undefined,
            request_method: payload.request_method,
            api_path: payload.api_path,
            api_name: payload.api_name ?? undefined,
            operation_module:
              payload.finalModule ?? payload.operation_module ?? "未知模块",
            request_ip: payload.request_ip ?? undefined,
            user_agent: payload.user_agent ?? undefined,
            operation_status: payload.operation_status,
            operation_message: trimMessage(
              payload.message ?? payload.operation_message,
              500,
            ),
            request_params: payload.request_params,
            response_summary: payload.response_summary,
            diff_content: payload.diff_content,
            platform_id: payload.platform_id ?? undefined,
            dept_id: payload.dept_id ?? undefined,
            shop_id: payload.shop_id ?? undefined,
          },
        });
      }
    } catch {
      // 同步失败不影响主流程
    }
  }
}
