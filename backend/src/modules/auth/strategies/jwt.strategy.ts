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
    if (!payload.sub || !payload.username) {
      return null;
    }
    // 将 sub 映射为 id，确保后端 Service 能通过 user.id 拿到数据
    return { 
      id: payload.sub, 
      username: payload.username,
      role: payload.role,
      is_super: payload.is_super 
    };
  }
}
