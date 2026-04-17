import { Rule } from "antd/es/form";

/**
 * 邮箱验证规则（带异步检查）
 * @param checkExists - 检查邮箱是否已存在的异步函数
 * @param required - 是否必填
 */
export const emailRules = (
  checkExists?: (email: string) => Promise<boolean>,
  required: boolean = true,
): Rule[] => {
  const rules: Rule[] = [];

  if (required) {
    rules.push({ required: true, message: "请输入邮箱" });
  }

  rules.push({ type: "email", message: "请输入有效的邮箱地址" });

  if (checkExists) {
    rules.push({
      validator: async (_, value) => {
        if (value) {
          const exists = await checkExists(value);
          if (exists) {
            throw new Error("该邮箱已被使用");
          }
        }
      },
    });
  }

  return rules;
};

/**
 * 手机号验证规则
 * @param required - 是否必填
 */
export const phoneRules = (required: boolean = true): Rule[] => {
  const rules: Rule[] = [];

  if (required) {
    rules.push({ required: true, message: "请输入手机号" });
  }

  rules.push({
    pattern: /^1[3-9]\d{9}$/,
    message: "请输入有效的手机号",
  });

  return rules;
};

/**
 * 密码验证规则
 * @param minLength - 最小长度
 * @param required - 是否必填
 */
export const passwordRules = (
  minLength: number = 6,
  required: boolean = true,
): Rule[] => {
  const rules: Rule[] = [];

  if (required) {
    rules.push({ required: true, message: "请输入密码" });
  }

  rules.push({
    min: minLength,
    message: `密码长度不能少于${minLength}位`,
  });

  return rules;
};

/**
 * 确认密码验证规则
 * @param passwordFieldName - 密码字段名称
 */
export const confirmPasswordRule = (
  passwordFieldName: string = "password",
): Rule => ({
  validator: async (_, value) => {
    const form = _.field?.split(".")[0];
    const password = form ? _.getFieldValue(passwordFieldName) : undefined;
    if (value && password && value !== password) {
      throw new Error("两次输入的密码不一致");
    }
  },
});

/**
 * URL验证规则
 * @param required - 是否必填
 */
export const urlRules = (required: boolean = true): Rule[] => {
  const rules: Rule[] = [];

  if (required) {
    rules.push({ required: true, message: "请输入URL" });
  }

  rules.push({ type: "url", message: "请输入有效的URL地址" });

  return rules;
};

/**
 * 数字范围验证规则
 * @param min - 最小值
 * @param max - 最大值
 * @param required - 是否必填
 */
export const numberRangeRules = (
  min?: number,
  max?: number,
  required: boolean = true,
): Rule[] => {
  const rules: Rule[] = [];

  if (required) {
    rules.push({ required: true, message: "请输入数字" });
  }

  rules.push({ type: "number", message: "请输入有效的数字" });

  if (min !== undefined) {
    rules.push({ type: "number", min, message: `不能小于${min}` });
  }

  if (max !== undefined) {
    rules.push({ type: "number", max, message: `不能大于${max}` });
  }

  return rules;
};

/**
 * 用户名验证规则（字母、数字、下划线）
 * @param minLength - 最小长度
 * @param maxLength - 最大长度
 * @param required - 是否必填
 */
export const usernameRules = (
  minLength: number = 3,
  maxLength: number = 20,
  required: boolean = true,
): Rule[] => {
  const rules: Rule[] = [];

  if (required) {
    rules.push({ required: true, message: "请输入用户名" });
  }

  rules.push({
    pattern: /^[a-zA-Z0-9_]+$/,
    message: "用户名只能包含字母、数字和下划线",
  });

  rules.push({
    min: minLength,
    max: maxLength,
    message: `用户名长度应在${minLength}-${maxLength}位之间`,
  });

  return rules;
};

/**
 * 身份证号验证规则
 * @param required - 是否必填
 */
export const idCardRules = (required: boolean = true): Rule[] => {
  const rules: Rule[] = [];

  if (required) {
    rules.push({ required: true, message: "请输入身份证号" });
  }

  rules.push({
    pattern: /(^\d{15}$)|(^\d{18}$)|(^\d{17}(\d|X|x)$)/,
    message: "请输入有效的身份证号",
  });

  return rules;
};

/**
 * 自定义异步验证规则
 * @param validator - 验证函数，返回true表示验证通过
 * @param errorMessage - 验证失败时的错误消息
 */
export const asyncValidatorRule = (
  validator: (value: any) => Promise<boolean>,
  errorMessage: string,
): Rule => ({
  validator: async (_, value) => {
    if (value) {
      const isValid = await validator(value);
      if (!isValid) {
        throw new Error(errorMessage);
      }
    }
  },
});
