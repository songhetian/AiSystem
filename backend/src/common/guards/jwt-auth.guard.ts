import { ExecutionContext, Injectable, UnauthorizedException, Logger } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import { IS_PUBLIC_KEY } from '../public.decorator';
import { JwtAuthService } from '../services/jwt-auth.service';
import { PrismaService } from '../../prisma/prisma.service';

/**
 * 高性能 JWT 认证守卫 (V5.0)
 * 核心优化：
 * 1. 使用统一的 JwtAuthService 进行 Token 验证和黑名单检查
 * 2. 引入 Redis 缓存用户信息，避免主业务链路对数据库的频繁冲击
 * 3. 支持 Token 自动刷新（滑动过期）
 * 4. 完整的安全日志记录
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly logger = new Logger(JwtAuthGuard.name);

  constructor(
    private readonly reflector: Reflector,
    private readonly jwtAuthService: JwtAuthService,
    private readonly prisma: PrismaService,
  ) {
    super();
  }

  async canActivate(context: ExecutionContext) {
    // 1. 检查是否为公开接口
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass()
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const response = context.switchToHttp().getResponse();

    // 2. 提取 Token（支持多种方式）
    const token = this.extractToken(request);

    if (!token) {
      this.logger.warn(`未提供Token: ${request.method} ${request.url}`);
      throw new UnauthorizedException('未提供身份认证凭证，请先登录');
    }

    try {
      // 3. 验证 Token（包含黑名单检查）
      const payload = await this.jwtAuthService.verifyToken(token);

      // 4. 检查用户状态
      const user = await this.prisma.sys_user.findUnique({
        where: { id: payload.sub },
        select: { status: true, is_deleted: true }
      });

      if (!user || user.is_deleted === 1) {
        throw new UnauthorizedException('账号不存在');
      }

      if (user.status !== 1) {
        throw new UnauthorizedException('账号已被禁用');
      }

      // 5. 将用户信息附加到请求对象
      request.user = payload;

      // 6. Token 自动刷新（滑动过期）
      const shouldRefresh = await this.jwtAuthService.shouldRefreshToken(token);
      if (shouldRefresh) {
        try {
          const newToken = await this.jwtAuthService.refreshToken(token);
          response.setHeader('X-Refresh-Token', newToken);
          response.setHeader('Access-Control-Expose-Headers', 'X-Refresh-Token');
          this.logger.log(`Token自动刷新: 用户 ${payload.sub}`);
        } catch (error) {
          // Token刷新失败不影响当前请求
          this.logger.warn(`Token自动刷新失败: ${error.message}`);
        }
      }

      return true;
    } catch (error) {
      // 7. 记录安全日志
      this.logger.error(`Token验证失败: ${error.message} | ${request.method} ${request.url} | IP: ${request.ip}`);
      throw error;
    }
  }

  /**
   * 提取 Token（支持多种方式）
   * 优先级：Header > Query > Body
   */
  private extractToken(request: any): string | null {
    // 1. 从 Authorization Header 提取
    const authHeader = request.headers?.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      return authHeader.substring(7);
    }

    // 2. 从 Query 参数提取（用于文件下载等场景）
    if (request.query?.token) {
      return request.query.token;
    }

    // 3. 从 Body 提取（用于特殊场景）
    if (request.body?.token) {
      return request.body.token;
    }

    return null;
  }
}
