/**
 * 邮件服务配置
 * Email Service Configuration
 *
 * Requirements: 22.3
 *
 * 职责:
 * - 配置 SMTP 邮件服务器参数
 * - 配置告警邮件模板
 * - 支持多种邮件服务商
 */

export interface EmailServiceConfig {
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
  /** 是否使用 SSL */
  useSSL: boolean;
  /** 连接超时时间（毫秒） */
  timeout: number;
  /** 是否启用邮件服务 */
  enabled: boolean;
}

export interface EmailTemplateConfig {
  /** 告警邮件主题前缀 */
  alertSubjectPrefix: string;
  /** 告警邮件模板 */
  alertTemplate: string;
  /** 系统通知邮件模板 */
  notificationTemplate: string;
}

/**
 * 获取邮件服务配置
 * Requirements: 22.3
 */
export function getEmailServiceConfig(): EmailServiceConfig {
  return {
    // SMTP 服务器地址
    // 常见服务商:
    // - Gmail: smtp.gmail.com
    // - QQ邮箱: smtp.qq.com
    // - 163邮箱: smtp.163.com
    // - 阿里云邮箱: smtp.aliyun.com
    host: process.env.SMTP_HOST || 'smtp.example.com',

    // SMTP 端口
    // 常用端口:
    // - 25: 非加密
    // - 465: SSL
    // - 587: TLS
    port: parseInt(process.env.SMTP_PORT || '587', 10),

    // SMTP 用户名（通常是邮箱地址）
    user: process.env.SMTP_USER || 'noreply@example.com',

    // SMTP 密码或授权码
    // 注意: 某些邮箱服务需要使用授权码而非登录密码
    password: process.env.SMTP_PASSWORD || '',

    // 发件人邮箱
    from: process.env.SMTP_FROM || process.env.SMTP_USER || 'noreply@example.com',

    // 发件人名称
    fromName: process.env.SMTP_FROM_NAME || '雷犀AI客服系统',

    // 是否使用 TLS
    useTLS: process.env.SMTP_USE_TLS === 'true',

    // 是否使用 SSL
    useSSL: process.env.SMTP_USE_SSL === 'true',

    // 连接超时时间（毫秒）
    timeout: parseInt(process.env.SMTP_TIMEOUT || '30000', 10),

    // 是否启用邮件服务
    // 如果未配置邮件服务器，可以禁用邮件功能
    enabled: process.env.SMTP_ENABLED !== 'false',
  };
}

/**
 * 获取邮件模板配置
 * Requirements: 22.3
 */
export function getEmailTemplateConfig(): EmailTemplateConfig {
  return {
    // 告警邮件主题前缀
    alertSubjectPrefix: process.env.ALERT_EMAIL_SUBJECT_PREFIX || '[系统告警]',

    // 告警邮件模板
    alertTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #f44336; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
    .alert-level { font-weight: bold; font-size: 18px; margin-bottom: 10px; }
    .alert-message { margin: 15px 0; }
    .alert-details { background-color: #fff; padding: 15px; border-left: 4px solid #f44336; margin-top: 15px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{alertTitle}}</h1>
    </div>
    <div class="content">
      <div class="alert-level">告警级别: {{alertLevel}}</div>
      <div class="alert-message">
        <strong>告警消息:</strong><br>
        {{alertMessage}}
      </div>
      <div class="alert-details">
        <strong>告警详情:</strong><br>
        <pre>{{alertDetails}}</pre>
      </div>
      <div style="margin-top: 15px;">
        <strong>告警时间:</strong> {{alertTime}}
      </div>
    </div>
    <div class="footer">
      <p>此邮件由系统自动发送，请勿回复</p>
      <p>雷犀AI客服系统</p>
    </div>
  </div>
</body>
</html>
    `,

    // 系统通知邮件模板
    notificationTemplate: `
<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8">
  <style>
    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
    .header { background-color: #2196F3; color: white; padding: 20px; text-align: center; }
    .content { background-color: #f9f9f9; padding: 20px; margin-top: 20px; }
    .footer { text-align: center; margin-top: 20px; color: #666; font-size: 12px; }
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <h1>{{title}}</h1>
    </div>
    <div class="content">
      {{content}}
    </div>
    <div class="footer">
      <p>此邮件由系统自动发送，请勿回复</p>
      <p>雷犀AI客服系统</p>
    </div>
  </div>
</body>
</html>
    `,
  };
}

/**
 * 验证邮件服务配置
 * Requirements: 22.3
 *
 * @throws Error 如果配置不完整或不合理
 */
export function validateEmailServiceConfig(): void {
  const config = getEmailServiceConfig();

  if (!config.enabled) {
    console.log('邮件服务已禁用，跳过配置验证');
    return;
  }

  const errors: string[] = [];

  // 验证 SMTP 服务器地址
  if (!config.host || config.host === 'smtp.example.com') {
    errors.push('SMTP 服务器地址未配置或使用默认值');
  }

  // 验证端口
  if (config.port < 1 || config.port > 65535) {
    errors.push('SMTP 端口号无效');
  }

  // 验证用户名
  if (!config.user || config.user === 'noreply@example.com') {
    errors.push('SMTP 用户名未配置或使用默认值');
  }

  // 验证密码
  if (!config.password) {
    errors.push('SMTP 密码未配置');
  }

  // 验证发件人邮箱
  if (!config.from || config.from === 'noreply@example.com') {
    errors.push('发件人邮箱未配置或使用默认值');
  }

  // 验证邮箱格式
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (config.from && !emailRegex.test(config.from)) {
    errors.push('发件人邮箱格式无效');
  }

  // 验证超时时间
  if (config.timeout < 5000) {
    errors.push('连接超时时间至少应为 5000 毫秒');
  }

  if (errors.length > 0) {
    throw new Error(`邮件服务配置验证失败:\n${errors.join('\n')}`);
  }
}

/**
 * 获取邮件服务配置说明
 * Requirements: 22.3
 */
export function getEmailServiceConfigDescription(): Record<string, string> {
  return {
    host: 'SMTP 服务器地址（如 smtp.gmail.com）',
    port: 'SMTP 端口（25=非加密, 465=SSL, 587=TLS）',
    user: 'SMTP 用户名（通常是邮箱地址）',
    password: 'SMTP 密码或授权码',
    from: '发件人邮箱',
    fromName: '发件人名称',
    useTLS: '是否使用 TLS 加密',
    useSSL: '是否使用 SSL 加密',
    timeout: '连接超时时间（毫秒）',
    enabled: '是否启用邮件服务',
  };
}

/**
 * 测试邮件服务配置
 * Requirements: 22.3
 *
 * @param testEmail 测试邮件接收地址
 * @returns 测试结果
 */
export async function testEmailServiceConfig(testEmail: string): Promise<{
  success: boolean;
  message: string;
}> {
  try {
    const config = getEmailServiceConfig();

    if (!config.enabled) {
      return {
        success: false,
        message: '邮件服务已禁用',
      };
    }

    // 验证配置
    validateEmailServiceConfig();

    // 这里可以实际发送测试邮件
    // 由于需要邮件发送库，这里仅返回配置验证结果
    return {
      success: true,
      message: '邮件服务配置验证通过',
    };
  } catch (error) {
    return {
      success: false,
      message: error instanceof Error ? error.message : String(error),
    };
  }
}
