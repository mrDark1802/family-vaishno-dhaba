import { Module } from "@nestjs/common";
import { AuthController } from "./auth.controller";
import { AuthService } from "./auth.service";
import { TwoFactorService } from "./two-factor.service";
import { GoogleAuthService } from "./google-auth.service";
import { AppleAuthService } from "./apple-auth.service";
import { PrismaModule } from "../../database/prisma.module";
import { AuthGuard } from "../../common/guards/auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";

@Module({
  imports: [PrismaModule],
  controllers: [AuthController],
  providers: [
    AuthService,
    TwoFactorService,
    GoogleAuthService,
    AppleAuthService,
    AuthGuard,
    RolesGuard,
  ],
  exports: [
    AuthService,
    TwoFactorService,
    GoogleAuthService,
    AppleAuthService,
    AuthGuard,
    RolesGuard,
  ],
})
export class AuthModule {}
