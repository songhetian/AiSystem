import { Body, Controller, Get, Post, Req } from '@nestjs/common';
import { Public } from '../../../common/public.decorator';
import { LoginDto } from '../dto/login.dto';
import { AuthService } from '../services/auth.service';

@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Public()
  @Post('login')
  login(@Body() dto: LoginDto, @Req() req: any) {
    return this.authService.login(dto, {
      ip: (req.headers?.['x-forwarded-for'] as string)?.split(',')?.[0]?.trim() || req.ip || req.socket?.remoteAddress || '',
      userAgent: (req.headers?.['user-agent'] as string) || ''
    });
  }

  @Get('me')
  me(@Req() req: { user: { sub: string } }) {
    return this.authService.me(req.user.sub);
  }

  @Post('logout')
  async logout(@Req() req: any) {
    const token = req.headers.authorization?.replace('Bearer ', '');
    return this.authService.logout(token);
  }
}
