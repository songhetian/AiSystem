import { applyDecorators } from "@nestjs/common";
import { ApiOperation, ApiResponse, ApiBearerAuth } from "@nestjs/swagger";

/**
 * API文档装饰器配置
 */
export interface ApiDocsOptions {
  summary: string; // 接口简要说明
  description?: string; // 接口详细描述
  auth?: boolean; // 是否需要认证
  successMessage?: string; // 成功响应提示
  errorCodes?: number[]; // 可能的错误码
}

/**
 * 统一API文档装饰器
 *
 * @example
 * @ApiDocs({
 *   summary: '获取用户列表',
 *   description: '分页查询用户列表，支持按用户名、手机号搜索',
 *   auth: true,
 *   successMessage: '查询成功',
 *   errorCodes: [400, 401, 403]
 * })
 */
export function ApiDocs(options: ApiDocsOptions) {
  const decorators = [
    ApiOperation({
      summary: options.summary,
      description: options.description,
    }),
    ApiResponse({
      status: 200,
      description: options.successMessage || "操作成功",
      schema: {
        type: "object",
        properties: {
          code: { type: "number", example: 200 },
          message: {
            type: "string",
            example: options.successMessage || "操作成功",
          },
          data: { type: "object" },
          timestamp: { type: "string", example: "2024-05-20T10:30:00Z" },
          path: { type: "string", example: "/api/v1/users" },
        },
      },
    }),
  ];

  // 添加认证装饰器
  if (options.auth !== false) {
    decorators.push(ApiBearerAuth());
  }

  // 添加错误响应
  if (options.errorCodes && options.errorCodes.length > 0) {
    const errorMessages: Record<number, string> = {
      400: "请求参数错误",
      401: "未授权",
      403: "无权限访问",
      404: "资源不存在",
      429: "请求过于频繁",
      500: "服务器内部错误",
      503: "服务暂时不可用",
    };

    options.errorCodes.forEach((code) => {
      decorators.push(
        ApiResponse({
          status: code,
          description: errorMessages[code] || "错误",
          schema: {
            type: "object",
            properties: {
              code: { type: "number", example: code },
              message: { type: "string", example: errorMessages[code] },
              data: { type: "null" },
              timestamp: { type: "string" },
              path: { type: "string" },
            },
          },
        }),
      );
    });
  }

  return applyDecorators(...decorators);
}
