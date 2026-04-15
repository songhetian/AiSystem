/**
 * 工业级个人隐私数据 (PII) 脱敏工具 (V6.0)
 * 职责：对手机号、邮箱、身份证号、密码等敏感信息进行脱敏处理，防止审计日志及接口回显示导致泄露。
 */
export class MaskUtil {
  /**
   * 脱敏手机号 (138****0001)
   */
  static maskPhone(phone: string): string {
    if (!phone) return '';
    return phone.replace(/(\d{3})\d{4}(\d{4})/, '$1****$2');
  }

  /**
   * 脱敏邮箱 (a****@example.com)
   */
  static maskEmail(email: string): string {
    if (!email) return '';
    const [user, domain] = email.split('@');
    if (!user || !domain) return email;
    return `${user.charAt(0)}****@${domain}`;
  }

  /**
   * 脱敏身份证号 (1101***********012)
   */
  static maskIdCard(idCard: string): string {
    if (!idCard) return '';
    return idCard.replace(/(\d{4})\d+(\d{4})/, '$1**********$2');
  }

  /**
   * 全局 JSON 脱敏引擎
   * 递归扫描对象的所有键，匹配敏感词并脱敏
   */
  static maskObject(obj: any): any {
    if (!obj || typeof obj !== 'object') return obj;

    const maskedObj = Array.isArray(obj) ? [...obj] : { ...obj };
    const sensitiveKeys = [
      'password', 'oldPassword', 'newPassword', 'token', 
      'phone', 'mobile', 'email', 'idCard', 'realName'
    ];

    for (const key in maskedObj) {
      const val = maskedObj[key];
      
      // 1. 递归处理嵌套对象
      if (typeof val === 'object') {
        maskedObj[key] = this.maskObject(val);
        continue;
      }

      // 2. 匹配关键字进行脱敏
      const lowerKey = key.toLowerCase();
      if (sensitiveKeys.some(k => lowerKey.includes(k.toLowerCase()))) {
        if (typeof val === 'string') {
          if (lowerKey.includes('password') || lowerKey.includes('token')) {
            maskedObj[key] = '******';
          } else if (lowerKey.includes('phone') || lowerKey.includes('mobile')) {
            maskedObj[key] = this.maskPhone(val);
          } else if (lowerKey.includes('email')) {
            maskedObj[key] = this.maskEmail(val);
          } else if (lowerKey.includes('idcard')) {
            maskedObj[key] = this.maskIdCard(val);
          }
        }
      }
    }

    return maskedObj;
  }
}
