import { Injectable } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';

import { ConfigService } from '@nestjs/config';

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy) {
  constructor(private configService: ConfigService) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get<string>('JWT_SECRET') || 'changeme'
    });
  }

  validate(payload: any) {
    console.log('🔑 [JwtStrategy] Validating Payload:', JSON.stringify(payload));
    
    if (!payload.sub || !payload.username) {
      console.error('❌ [JwtStrategy] Invalid Payload: sub or username missing');
      return null;
    }

    const user = { 
      id: payload.sub, 
      sub: payload.sub, // 兼容某些使用了 req.user.sub 的旧代码
      username: payload.username,
      platform_id: payload.platform_id,
      dept_id: payload.dept_id,
      shop_id: payload.shop_id,
    };
    
    console.log('✅ [JwtStrategy] User injected into request:', JSON.stringify(user));
    return user;
  }
}
