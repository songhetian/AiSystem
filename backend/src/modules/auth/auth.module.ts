import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { CommonModule } from "../../common/common.module";
import { SystemModule } from "../system/system.module";
import { AuthController } from "./controllers/auth.controller";
import { CaptchaController } from "./controllers/captcha.controller";
import { RegisterController } from "./controllers/register.controller";
import { AuthService } from "./services/auth.service";
import { RegisterService } from "./services/register.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

import { ConfigService } from "@nestjs/config";

@Module({
  imports: [
    PassportModule,
    CommonModule,
    SystemModule,
    JwtModule.registerAsync({
      global: true,
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get("JWT_SECRET") || "changeme",
        signOptions: {
          expiresIn: configService.get("JWT_EXPIRES_IN") || "2h",
        },
      }),
      inject: [ConfigService],
    }),
  ],
  controllers: [AuthController, CaptchaController, RegisterController],
  providers: [AuthService, RegisterService, JwtStrategy],
  exports: [AuthService, RegisterService],
})
export class AuthModule {}
