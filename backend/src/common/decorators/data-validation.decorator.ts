import { SetMetadata } from "@nestjs/common";

/**
 * 数据验证规则
 */
export interface ValidationRule {
  field: string; // 字段名
  type?: "string" | "number" | "email" | "phone" | "idCard" | "url" | "date";
  required?: boolean; // 是否必填
  min?: number; // 最小值/最小长度
  max?: number; // 最大值/最大长度
  pattern?: RegExp; // 正则表达式
  custom?: (value: any) => boolean | Promise<boolean>; // 自定义验证函数
  message?: string; // 错误提示信息
}

/**
 * SQL注入防护配置
 */
export interface SqlInjectionProtection {
  enabled: boolean;
  fields?: string[]; // 需要检查的字段，不指定则检查所有字符串字段
  strictMode?: boolean; // 严格模式：禁止任何SQL关键字
}

/**
 * XSS防护配置
 */
export interface XssProtection {
  enabled: boolean;
  fields?: string[]; // 需要检查的字段
  sanitize?: boolean; // 是否自动清理
}

/**
 * 数据验证配置
 */
export interface DataValidationOptions {
  rules?: ValidationRule[];
  sqlInjection?: SqlInjectionProtection;
  xss?: XssProtection;
  trimStrings?: boolean; // 是否自动去除字符串首尾空格
  removeEmptyStrings?: boolean; // 是否移除空字符串
}

export const DATA_VALIDATION_KEY = "data_validation";

/**
 * 数据验证装饰器
 *
 * @example
 * @DataValidation({
 *   rules: [
 *     { field: 'username', required: true, min: 3, max: 20 },
 *     { field: 'email', type: 'email', required: true },
 *     { field: 'phone', type: 'phone' },
 *     { field: 'age', type: 'number', min: 18, max: 100 }
 *   ],
 *   sqlInjection: { enabled: true, strictMode: true },
 *   xss: { enabled: true, sanitize: true },
 *   trimStrings: true
 * })
 * async createUser(@Body() dto: CreateUserDto) {
 *   // 数据已经过验证和清理
 * }
 */
export const DataValidation = (options: DataValidationOptions) =>
  SetMetadata(DATA_VALIDATION_KEY, options);
