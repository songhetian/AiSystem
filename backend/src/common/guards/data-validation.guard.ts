import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Reflector } from "@nestjs/core";
import {
  DATA_VALIDATION_KEY,
  DataValidationOptions,
  ValidationRule,
} from "../decorators/data-validation.decorator";

/**
 * 数据验证守卫
 * 防止SQL注入、XSS攻击，并进行数据格式验证
 */
@Injectable()
export class DataValidationGuard implements CanActivate {
  private readonly logger = new Logger(DataValidationGuard.name);

  // SQL注入关键字
  private readonly sqlKeywords = [
    "SELECT",
    "INSERT",
    "UPDATE",
    "DELETE",
    "DROP",
    "CREATE",
    "ALTER",
    "EXEC",
    "EXECUTE",
    "UNION",
    "DECLARE",
    "CAST",
    "CONVERT",
    "--",
    "/*",
    "*/",
    "xp_",
    "sp_",
    "WAITFOR",
    "DELAY",
  ];

  // XSS危险标签和属性
  private readonly xssPatterns = [
    /<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi,
    /<iframe\b[^<]*(?:(?!<\/iframe>)<[^<]*)*<\/iframe>/gi,
    /javascript:/gi,
    /on\w+\s*=/gi,
  ];

  constructor(private readonly reflector: Reflector) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const options = this.reflector.get<DataValidationOptions>(
      DATA_VALIDATION_KEY,
      context.getHandler(),
    );

    if (!options) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const data = { ...request.body, ...request.query, ...request.params };

    try {
      // 1. 数据清理
      if (options.trimStrings) {
        this.trimStrings(data);
      }

      if (options.removeEmptyStrings) {
        this.removeEmptyStrings(data);
      }

      // 2. SQL注入检查
      if (options.sqlInjection?.enabled) {
        this.checkSqlInjection(data, options.sqlInjection);
      }

      // 3. XSS检查
      if (options.xss?.enabled) {
        this.checkXss(data, options.xss);
      }

      // 4. 字段验证
      if (options.rules && options.rules.length > 0) {
        await this.validateFields(data, options.rules);
      }

      // 更新请求数据
      request.body = data;

      return true;
    } catch (error) {
      if (error instanceof HttpException) {
        throw error;
      }
      this.logger.error(`Data validation error: ${error.message}`);
      throw new HttpException(
        {
          code: HttpStatus.BAD_REQUEST,
          message: "数据验证失败",
          data: null,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  /**
   * 去除字符串首尾空格
   */
  private trimStrings<T extends Record<string, any>>(data: T): void {
    for (const key in data) {
      if (typeof data[key] === "string") {
        data[key] = data[key].trim();
      } else if (typeof data[key] === "object" && data[key] !== null) {
        this.trimStrings(data[key]);
      }
    }
  }

  /**
   * 移除空字符串
   */
  private removeEmptyStrings<T extends Record<string, any>>(data: T): void {
    for (const key in data) {
      if (data[key] === "") {
        delete data[key];
      } else if (typeof data[key] === "object" && data[key] !== null) {
        this.removeEmptyStrings(data[key]);
      }
    }
  }

  /**
   * SQL注入检查
   */
  private checkSqlInjection<T extends Record<string, any>>(
    data: T,
    config: Record<string, any>,
  ): void {
    const fields = config.fields || Object.keys(data);

    for (const field of fields) {
      const value = data[field];
      if (typeof value !== "string") continue;

      const upperValue = value.toUpperCase();

      // 检查SQL关键字
      for (const keyword of this.sqlKeywords) {
        if (upperValue.includes(keyword)) {
          this.logger.warn(
            `SQL injection attempt detected in field "${field}": ${value}`,
          );
          throw new HttpException(
            {
              code: HttpStatus.BAD_REQUEST,
              message: `字段 "${field}" 包含非法字符`,
              data: null,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // 严格模式：检查特殊字符
      if (config.strictMode) {
        const dangerousChars = /[';\"\\]/;
        if (dangerousChars.test(value)) {
          this.logger.warn(
            `Dangerous characters detected in field "${field}": ${value}`,
          );
          throw new HttpException(
            {
              code: HttpStatus.BAD_REQUEST,
              message: `字段 "${field}" 包含非法字符`,
              data: null,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }
  }

  /**
   * XSS检查
   */
  private checkXss<T extends Record<string, any>>(
    data: T,
    config: Record<string, any>,
  ): void {
    const fields = config.fields || Object.keys(data);

    for (const field of fields) {
      const value = data[field];
      if (typeof value !== "string") continue;

      // 检查XSS模式
      for (const pattern of this.xssPatterns) {
        if (pattern.test(value)) {
          this.logger.warn(
            `XSS attempt detected in field "${field}": ${value}`,
          );

          if (config.sanitize) {
            // 清理危险内容
            data[field] = value.replace(pattern, "");
          } else {
            throw new HttpException(
              {
                code: HttpStatus.BAD_REQUEST,
                message: `字段 "${field}" 包含非法内容`,
                data: null,
              },
              HttpStatus.BAD_REQUEST,
            );
          }
        }
      }
    }
  }

  /**
   * 字段验证
   */
  private async validateFields(
    data: any,
    rules: ValidationRule[],
  ): Promise<void> {
    for (const rule of rules) {
      const value = data[rule.field];

      // 必填验证
      if (
        rule.required &&
        (value === undefined || value === null || value === "")
      ) {
        throw new HttpException(
          {
            code: HttpStatus.BAD_REQUEST,
            message: rule.message || `字段 "${rule.field}" 不能为空`,
            data: null,
          },
          HttpStatus.BAD_REQUEST,
        );
      }

      if (value === undefined || value === null) continue;

      // 类型验证
      if (rule.type) {
        const valid = await this.validateType(value, rule.type, rule.field);
        if (!valid) {
          throw new HttpException(
            {
              code: HttpStatus.BAD_REQUEST,
              message: rule.message || `字段 "${rule.field}" 格式不正确`,
              data: null,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // 长度/范围验证
      if (typeof value === "string") {
        if (rule.min !== undefined && value.length < rule.min) {
          throw new HttpException(
            {
              code: HttpStatus.BAD_REQUEST,
              message:
                rule.message ||
                `字段 "${rule.field}" 长度不能少于 ${rule.min} 个字符`,
              data: null,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        if (rule.max !== undefined && value.length > rule.max) {
          throw new HttpException(
            {
              code: HttpStatus.BAD_REQUEST,
              message:
                rule.message ||
                `字段 "${rule.field}" 长度不能超过 ${rule.max} 个字符`,
              data: null,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      } else if (typeof value === "number") {
        if (rule.min !== undefined && value < rule.min) {
          throw new HttpException(
            {
              code: HttpStatus.BAD_REQUEST,
              message:
                rule.message || `字段 "${rule.field}" 不能小于 ${rule.min}`,
              data: null,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
        if (rule.max !== undefined && value > rule.max) {
          throw new HttpException(
            {
              code: HttpStatus.BAD_REQUEST,
              message:
                rule.message || `字段 "${rule.field}" 不能大于 ${rule.max}`,
              data: null,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // 正则验证
      if (rule.pattern && typeof value === "string") {
        if (!rule.pattern.test(value)) {
          throw new HttpException(
            {
              code: HttpStatus.BAD_REQUEST,
              message: rule.message || `字段 "${rule.field}" 格式不正确`,
              data: null,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }

      // 自定义验证
      if (rule.custom) {
        const valid = await rule.custom(value);
        if (!valid) {
          throw new HttpException(
            {
              code: HttpStatus.BAD_REQUEST,
              message: rule.message || `字段 "${rule.field}" 验证失败`,
              data: null,
            },
            HttpStatus.BAD_REQUEST,
          );
        }
      }
    }
  }

  /**
   * 类型验证
   */
  private async validateType(
    value: any,
    type: string,
    field: string,
  ): Promise<boolean> {
    switch (type) {
      case "string":
        return typeof value === "string";

      case "number":
        return typeof value === "number" && !isNaN(value);

      case "email":
        const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return typeof value === "string" && emailPattern.test(value);

      case "phone":
        const phonePattern = /^1[3-9]\d{9}$/;
        return typeof value === "string" && phonePattern.test(value);

      case "idCard":
        const idCardPattern =
          /^[1-9]\d{5}(18|19|20)\d{2}(0[1-9]|1[0-2])(0[1-9]|[12]\d|3[01])\d{3}[\dXx]$/;
        return typeof value === "string" && idCardPattern.test(value);

      case "url":
        try {
          new URL(value);
          return true;
        } catch {
          return false;
        }

      case "date":
        return !isNaN(Date.parse(value));

      default:
        return true;
    }
  }
}
