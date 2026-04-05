import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

interface LoginLogPayload {
  user_id?: string | null;
  username: string;
  login_ip?: string | null;
  user_agent?: string | null;
  login_status: number;
  login_message?: string | null;
  platform_id?: string | null;
  dept_id?: string | null;
  shop_id?: string | null;
}

interface OperationLogPayload {
  user_id?: string | null;
  username?: string | null;
  request_method: string;
  api_path: string;
  api_name?: string | null;
  operation_module?: string | null;
  request_ip?: string | null;
  user_agent?: string | null;
  operation_status: number;
  operation_message?: string | null;
  request_params?: unknown;
  response_summary?: unknown;
  platform_id?: string | null;
  dept_id?: string | null;
  shop_id?: string | null;
}

function trimMessage(value?: string | null, max = 190) {
  if (!value) {
    return undefined;
  }
  return value.length > max ? value.slice(0, max) : value;
}

@Injectable()
export class AuditLogService {
  constructor(private readonly prisma: PrismaService) {}

  async logLogin(payload: LoginLogPayload) {
    await this.prisma.sys_login_log.create({
      data: {
        user_id: payload.user_id ?? undefined,
        username: payload.username,
        login_ip: payload.login_ip ?? undefined,
        user_agent: payload.user_agent ?? undefined,
        login_status: payload.login_status,
        login_message: trimMessage(payload.login_message),
        platform_id: payload.platform_id ?? undefined,
        dept_id: payload.dept_id ?? undefined,
        shop_id: payload.shop_id ?? undefined
      }
    });
  }

  async logOperation(payload: OperationLogPayload) {
    await this.prisma.sys_operation_log.create({
      data: {
        user_id: payload.user_id ?? undefined,
        username: payload.username ?? undefined,
        request_method: payload.request_method,
        api_path: payload.api_path,
        api_name: payload.api_name ?? undefined,
        operation_module: payload.operation_module ?? undefined,
        request_ip: payload.request_ip ?? undefined,
        user_agent: payload.user_agent ?? undefined,
        operation_status: payload.operation_status,
        operation_message: trimMessage(payload.operation_message),
        request_params: payload.request_params as any,
        response_summary: payload.response_summary as any,
        platform_id: payload.platform_id ?? undefined,
        dept_id: payload.dept_id ?? undefined,
        shop_id: payload.shop_id ?? undefined
      }
    });
  }
}
