import { SetMetadata } from "@nestjs/common";

/**
 * 防重放攻击配置
 */
export interface AntiReplayOptions {
  enabled: boolean; // 是否启用
  timeWindow?: number; // 时间窗口（秒），默认300秒
  nonceRequired?: boolean; // 是否需要随机字符串
}

/**
 * 防刷配置
 */
export interface AntiBrushOptions {
  enabled: boolean; // 是否启用
  captcha?: boolean; // 是否需要验证码
  smsVerify?: boolean; // 是否需要短信验证
}

/**
 * 数据脱敏配置
 */
export interface DataMaskOptions {
  fields: string[]; // 需要脱敏的字段
  maskType?: "phone" | "idCard" | "bankCard" | "email" | "custom";
  customMask?: (value: string) => string;
}

export const ANTI_REPLAY_KEY = "anti_replay";
export const ANTI_BRUSH_KEY = "anti_brush";
export const DATA_MASK_KEY = "data_mask";

/**
 * 防重放攻击装饰器
 *
 * @example
 * @AntiReplay({ enabled: true, timeWindow: 300, nonceRequired: true })
 */
export const AntiReplay = (options: AntiReplayOptions) =>
  SetMetadata(ANTI_REPLAY_KEY, options);

/**
 * 防刷装饰器
 *
 * @example
 * @AntiBrush({ enabled: true, captcha: true })
 */
export const AntiBrush = (options: AntiBrushOptions) =>
  SetMetadata(ANTI_BRUSH_KEY, options);

/**
 * 数据脱敏装饰器
 *
 * @example
 * @DataMask({ fields: ['phone', 'idCard'], maskType: 'phone' })
 */
export const DataMask = (options: DataMaskOptions) =>
  SetMetadata(DATA_MASK_KEY, options);
