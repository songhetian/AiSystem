/**
 * 高可用配置
 * 熔断、限流、降级的统一配置管理
 */
export const HighAvailabilityConfig = {
  /**
   * 熔断配置
   */
  circuitBreaker: {
    // 默认配置
    default: {
      failureThreshold: 10, // 连续失败10次触发熔断
      errorRate: 0.3, // 错误率30%触发熔断
      timeout: 3000, // 响应超时3秒
      resetTimeout: 60000, // 熔断窗口期60秒
      halfOpenRequests: 5, // 半开状态探测请求数
      halfOpenSuccessRate: 0.8, // 半开状态成功率80%恢复
    },
    // 第三方服务配置
    thirdParty: {
      failureThreshold: 5, // 第三方服务更敏感
      errorRate: 0.2,
      timeout: 5000,
      resetTimeout: 120000, // 第三方服务熔断时间更长
      halfOpenRequests: 3,
      halfOpenSuccessRate: 0.8,
    },
  },

  /**
   * 限流配置
   */
  rateLimit: {
    // IP限流
    ip: {
      limit: 10, // 每分钟10次
      window: 60, // 时间窗口60秒
      message: "请求过于频繁，请稍后再试",
    },
    // 用户限流
    user: {
      limit: 5, // 每10秒5次
      window: 10,
      message: "操作过于频繁，请稍后再试",
    },
    // 核心接口限流
    coreApi: {
      limit: 20, // 每秒20次
      window: 1,
      enableQueue: true, // 启用排队
      queueSize: 50, // 队列大小50
      queueTimeout: 5, // 队列超时5秒
    },
    // 非核心接口限流
    normalApi: {
      limit: 50, // 每秒50次
      window: 1,
      enableQueue: false,
    },
    // 全局限流
    global: {
      limit: 100, // 每秒100次
      window: 1,
      message: "系统繁忙，请稍后再试",
    },
  },

  /**
   * 降级配置
   */
  degradation: {
    // 监控阈值
    thresholds: {
      cpu: {
        light: 85, // CPU 85%触发一级降级
        medium: 90, // CPU 90%触发二级降级
        heavy: 95, // CPU 95%触发三级降级
      },
      memory: {
        light: 80, // 内存 80%触发一级降级
        medium: 85, // 内存 85%触发二级降级
        heavy: 90, // 内存 90%触发三级降级
      },
      duration: 30000, // 持续时间30秒
      recoveryDuration: 60000, // 恢复持续时间60秒
    },
    // 降级策略
    strategies: {
      light: {
        // 一级降级：关闭非核心功能
        disabledFeatures: [
          "data-statistics", // 数据统计
          "report-export", // 报表导出
          "history-query", // 历史数据查询
        ],
      },
      medium: {
        // 二级降级：简化次要核心功能
        disabledFeatures: [
          "data-statistics",
          "report-export",
          "history-query",
          "message-notification", // 消息通知
          "avatar-upload", // 头像上传
        ],
        simplifiedFeatures: [
          "report-export", // 报表导出简化为基础数据
        ],
      },
      heavy: {
        // 三级降级：仅保留核心功能
        enabledFeatures: [
          "user-login", // 用户登录
          "user-auth", // 用户认证
          "core-data-query", // 核心数据查询
          "payment", // 支付流程
        ],
      },
    },
  },

  /**
   * 安全配置
   */
  security: {
    // 防重放攻击
    antiReplay: {
      enabled: true,
      timeWindow: 300, // 时间窗口5分钟
      nonceRequired: true, // 需要随机字符串
    },
    // 防刷
    antiBrush: {
      enabled: true,
      captchaThreshold: 3, // 失败3次需要验证码
      smsVerifyThreshold: 5, // 失败5次需要短信验证
    },
    // 数据脱敏
    dataMask: {
      phone: {
        pattern: /^(\d{3})\d{4}(\d{4})$/,
        replacement: "$1****$2",
      },
      idCard: {
        pattern: /^(\d{6})\d{8}(\d{4})$/,
        replacement: "$1********$2",
      },
      bankCard: {
        pattern: /^(\d{4})\d+(\d{4})$/,
        replacement: "$1****$2",
      },
      email: {
        pattern: /^(.{2}).*(@.*)$/,
        replacement: "$1****$2",
      },
    },
  },

  /**
   * 监控配置
   */
  monitoring: {
    // 日志保留时间
    logRetention: {
      normal: 30, // 普通日志30天
      security: 90, // 安全日志90天
      audit: 180, // 审计日志180天
    },
    // 告警配置
    alert: {
      channels: ["email", "sms", "system"],
      recipients: {
        email: ["admin@example.com"],
        sms: ["+86-13800138000"],
      },
      // 告警阈值
      thresholds: {
        circuitBreakerOpen: 3, // 3个接口熔断触发告警
        rateLimitExceeded: 100, // 限流次数超过100触发告警
        degradationLevel: 2, // 降级级别达到2触发告警
      },
    },
  },
};

/**
 * 获取配置
 */
export function getConfig(path: string): any {
  const keys = path.split(".");
  let value: any = HighAvailabilityConfig;

  for (const key of keys) {
    if (value && typeof value === "object" && key in value) {
      value = value[key];
    } else {
      return undefined;
    }
  }

  return value;
}

/**
 * 更新配置
 */
export function updateConfig(path: string, newValue: any): void {
  const keys = path.split(".");
  const lastKey = keys.pop();
  let target: any = HighAvailabilityConfig;

  for (const key of keys) {
    if (target && typeof target === "object" && key in target) {
      target = target[key];
    } else {
      return;
    }
  }

  if (lastKey && target && typeof target === "object") {
    target[lastKey] = newValue;
  }
}
