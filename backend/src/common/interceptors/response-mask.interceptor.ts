import {
  CallHandler,
  ExecutionContext,
  Injectable,
  NestInterceptor,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { MaskUtil } from '../utils/mask.util';

/**
 * 全局响应脱敏拦截器 (V6.0)
 * 职责：在数据返回前端之前，自动对 PII 敏感字段进行掩码处理，确保数据合规性。
 */
@Injectable()
export class ResponseMaskInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const request = context.switchToHttp().getRequest();
    
    // V7.0 精修：实现细粒度权限判定
    // 逻辑：超级管理员 或 拥有 'SYS_DATA_PII_VIEW' 权限的账号免除脱敏
    const isSuper = request.user?.is_super;
    const permissions = request.user?.permissions || [];
    const hasPiiPermission = permissions.includes('SYS_DATA_PII_VIEW');

    if (isSuper || hasPiiPermission) {
      return next.handle();
    }

    return next.handle().pipe(
      map((data) => {
        return MaskUtil.maskObject(data);
      }),
    );
  }
}
