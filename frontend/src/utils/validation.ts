/**
 * 数据验证工具
 */

/**
 * 验证规则接口
 */
export interface ValidationRule {
  required?: boolean;
  min?: number;
  max?: number;
  pattern?: RegExp;
  validator?: (value: any) => boolean | string;
  message?: string;
}

/**
 * 验证结果接口
 */
export interface ValidationResult {
  valid: boolean;
  errors: Record<string, string[]>;
}

/**
 * 验证器类
 */
export class Validator {
  private rules: Record<string, ValidationRule[]> = {};

  /**
   * 添加验证规则
   */
  addRule(field: string, rule: ValidationRule): this {
    if (!this.rules[field]) {
      this.rules[field] = [];
    }
    this.rules[field].push(rule);
    return this;
  }

  /**
   * 验证数据
   */
  validate(data: Record<string, any>): ValidationResult {
    const errors: Record<string, string[]> = {};

    for (const [field, rules] of Object.entries(this.rules)) {
      const value = data[field];
      const fieldErrors: string[] = [];

      for (const rule of rules) {
        const error = this.validateField(value, rule, field);
        if (error) {
          fieldErrors.push(error);
        }
      }

      if (fieldErrors.length > 0) {
        errors[field] = fieldErrors;
      }
    }

    return {
      valid: Object.keys(errors).length === 0,
      errors,
    };
  }

  /**
   * 验证单个字段
   */
  private validateField(
    value: any,
    rule: ValidationRule,
    field: string,
  ): string | null {
    // 必填验证
    if (
      rule.required &&
      (value === undefined || value === null || value === "")
    ) {
      return rule.message || `${field}不能为空`;
    }

    // 如果值为空且非必填，跳过其他验证
    if (value === undefined || value === null || value === "") {
      return null;
    }

    // 最小长度/值验证
    if (rule.min !== undefined) {
      if (typeof value === "string" && value.length < rule.min) {
        return rule.message || `${field}长度不能少于${rule.min}个字符`;
      }
      if (typeof value === "number" && value < rule.min) {
        return rule.message || `${field}不能小于${rule.min}`;
      }
    }

    // 最大长度/值验证
    if (rule.max !== undefined) {
      if (typeof value === "string" && value.length > rule.max) {
        return rule.message || `${field}长度不能超过${rule.max}个字符`;
      }
      if (typeof value === "number" && value > rule.max) {
        return rule.message || `${field}不能大于${rule.max}`;
      }
    }

    // 正则验证
    if (rule.pattern && typeof value === "string") {
      if (!rule.pattern.test(value)) {
        return rule.message || `${field}格式不正确`;
      }
    }

    // 自定义验证
    if (rule.validator) {
      const result = rule.validator(value);
      if (result === false) {
        return rule.message || `${field}验证失败`;
      }
      if (typeof result === "string") {
        return result;
      }
    }

    return null;
  }
}

/**
 * 常用验证规则
 */
export const CommonRules = {
  /**
   * 必填
   */
  required: (message?: string): ValidationRule => ({
    required: true,
    message,
  }),

  /**
   * 邮箱
   */
  email: (message?: string): ValidationRule => ({
    pattern: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
    message: message || "请输入有效的邮箱地址",
  }),

  /**
   * 手机号
   */
  phone: (message?: string): ValidationRule => ({
    pattern: /^1[3-9]\d{9}$/,
    message: message || "请输入有效的手机号码",
  }),

  /**
   * 身份证号
   */
  idCard: (message?: string): ValidationRule => ({
    pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
    message: message || "请输入有效的身份证号码",
  }),

  /**
   * URL
   */
  url: (message?: string): ValidationRule => ({
    pattern: /^https?:\/\/.+/,
    message: message || "请输入有效的URL地址",
  }),

  /**
   * 数字
   */
  number: (message?: string): ValidationRule => ({
    pattern: /^\d+$/,
    message: message || "请输入数字",
  }),

  /**
   * 字母
   */
  alpha: (message?: string): ValidationRule => ({
    pattern: /^[a-zA-Z]+$/,
    message: message || "请输入字母",
  }),

  /**
   * 字母和数字
   */
  alphaNum: (message?: string): ValidationRule => ({
    pattern: /^[a-zA-Z0-9]+$/,
    message: message || "请输入字母或数字",
  }),

  /**
   * 最小长度
   */
  minLength: (min: number, message?: string): ValidationRule => ({
    min,
    message: message || `长度不能少于${min}个字符`,
  }),

  /**
   * 最大长度
   */
  maxLength: (max: number, message?: string): ValidationRule => ({
    max,
    message: message || `长度不能超过${max}个字符`,
  }),

  /**
   * 范围
   */
  range: (min: number, max: number, message?: string): ValidationRule => ({
    min,
    max,
    message: message || `长度必须在${min}-${max}个字符之间`,
  }),

  /**
   * 自定义验证
   */
  custom: (
    validator: (value: any) => boolean | string,
    message?: string,
  ): ValidationRule => ({
    validator,
    message,
  }),
};

/**
 * 快速验证函数
 */
export function validate(
  data: Record<string, any>,
  rules: Record<string, ValidationRule[]>,
): ValidationResult {
  const validator = new Validator();

  for (const [field, fieldRules] of Object.entries(rules)) {
    for (const rule of fieldRules) {
      validator.addRule(field, rule);
    }
  }

  return validator.validate(data);
}

/**
 * 验证单个字段
 */
export function validateField(
  value: any,
  rules: ValidationRule[],
  fieldName: string = "field",
): string | null {
  const validator = new Validator();
  for (const rule of rules) {
    validator.addRule(fieldName, rule);
  }

  const result = validator.validate({ [fieldName]: value });
  return result.errors[fieldName]?.[0] || null;
}

/**
 * 权限相关验证
 */
export const PermissionValidation = {
  /**
   * 验证角色名称
   */
  roleName: (value: string): boolean | string => {
    if (!value || value.trim().length === 0) {
      return "角色名称不能为空";
    }
    if (value.length < 2) {
      return "角色名称至少2个字符";
    }
    if (value.length > 50) {
      return "角色名称不能超过50个字符";
    }
    return true;
  },

  /**
   * 验证角色编码
   */
  roleCode: (value: string): boolean | string => {
    if (!value || value.trim().length === 0) {
      return "角色编码不能为空";
    }
    if (!/^[a-zA-Z][a-zA-Z0-9_]*$/.test(value)) {
      return "角色编码必须以字母开头，只能包含字母、数字和下划线";
    }
    if (value.length < 2) {
      return "角色编码至少2个字符";
    }
    if (value.length > 50) {
      return "角色编码不能超过50个字符";
    }
    return true;
  },

  /**
   * 验证模板名称
   */
  templateName: (value: string): boolean | string => {
    if (!value || value.trim().length === 0) {
      return "模板名称不能为空";
    }
    if (value.length < 2) {
      return "模板名称至少2个字符";
    }
    if (value.length > 100) {
      return "模板名称不能超过100个字符";
    }
    return true;
  },

  /**
   * 验证权限ID列表
   */
  permissionIds: (value: string[]): boolean | string => {
    if (!Array.isArray(value)) {
      return "权限ID必须是数组";
    }
    if (value.length === 0) {
      return "请至少选择一个权限";
    }
    if (value.length > 100) {
      return "权限数量不能超过100个";
    }
    return true;
  },

  /**
   * 验证批量操作数量
   */
  batchSize: (value: number, max: number = 100): boolean | string => {
    if (typeof value !== "number" || value <= 0) {
      return "数量必须大于0";
    }
    if (value > max) {
      return `批量操作数量不能超过${max}个`;
    }
    return true;
  },
};

/**
 * 表单验证辅助函数
 */
export function getFormValidationRules(
  rules: ValidationRule[],
): Array<{ validator: (_: any, value: any) => Promise<void> }> {
  return rules.map((rule) => ({
    validator: async (_: any, value: any) => {
      const validator = new Validator();
      validator.addRule("field", rule);
      const result = validator.validate({ field: value });

      if (!result.valid) {
        throw new Error(result.errors.field[0]);
      }
    },
  }));
}

/**
 * 批量验证
 */
export function validateBatch(
  items: Array<Record<string, any>>,
  rules: Record<string, ValidationRule[]>,
): Array<{ index: number; errors: Record<string, string[]> }> {
  const results: Array<{ index: number; errors: Record<string, string[]> }> =
    [];

  items.forEach((item, index) => {
    const result = validate(item, rules);
    if (!result.valid) {
      results.push({ index, errors: result.errors });
    }
  });

  return results;
}
