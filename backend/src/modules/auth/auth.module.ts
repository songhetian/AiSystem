import { Module } from "@nestjs/common";
import { JwtModule } from "@nestjs/jwt";
import { PassportModule } from "@nestjs/passport";
import { CommonModule } from "../../common/common.module";
import { AuthController } from "./controllers/auth.controller";
import { CaptchaController } from "./controllers/captcha.controller";
import { RegisterController } from "./controllers/register.controller";
import { AuthService } from "./services/auth.service";
import { RegisterService } from "./services/register.service";
import { JwtStrategy } from "./strategies/jwt.strategy";

@Module({
  imports: [
    PassportModule,
    CommonModule,
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET ?? "changeme",
      signOptions: { expiresIn: (process.env.JWT_EXPIRES_IN ?? "2h") as never },
    }),
  ],
  controllers: [AuthController, CaptchaController, RegisterController],
  providers: [AuthService, RegisterService, JwtStrategy],
  exports: [AuthService, RegisterService],
})
export class AuthModule {}
