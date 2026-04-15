import * as crypto from 'crypto';

/**
 * 通用哈希工具类 (V3.0)
 */
export class CryptoUtil {
  /**
   * 生成 MD5 摘要
   */
  static md5(content: string): string {
    return crypto.createHash('md5').update(content).digest('hex');
  }

  /**
   * 生成对象/请求指纹
   */
  static generateFingerprint(data: any): string {
    const str = typeof data === 'string' ? data : JSON.stringify(data);
    return this.md5(str);
  }

  /**
   * 生成 SHA256 摘要
   */
  static sha256(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }
}
