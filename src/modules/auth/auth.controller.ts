import {
  Controller,
  Post,
  Get,
  Body,
  Query,
  Req,
  Res,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { AuthService } from "./auth.service";
import { TwoFactorService } from "./two-factor.service";
import { GoogleAuthService, sanitizeReturnUrl } from "./google-auth.service";
import { AppleAuthService } from "./apple-auth.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { Verify2FASetupDto } from "./dto/verify-2fa-setup.dto";
import { Verify2FALoginDto } from "./dto/verify-2fa-login.dto";
import { Verify2FARecoveryDto } from "./dto/verify-2fa-recovery.dto";
import { Disable2FADto } from "./dto/disable-2fa.dto";
import { RegenerateRecoveryCodesDto } from "./dto/regenerate-recovery-codes.dto";
import { NativeGoogleAuthDto, NativeAppleAuthDto } from "./dto/native-auth.dto";
import { AuthGuard } from "../../common/guards/auth.guard";
import { OptionalAuthGuard } from "../../common/guards/optional-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  CustomerProfile,
  TwoFactorSetupResponse,
  TwoFactorStatusResponse,
  ConnectedAccountsResponse,
} from "../../types";
import { Throttle } from "@nestjs/throttler";
import { Request, Response } from "express";

@Controller("auth")
export class AuthController {
  private readonly logger = new Logger(AuthController.name);

  constructor(
    private readonly authService: AuthService,
    private readonly twoFactorService: TwoFactorService,
    private readonly googleAuthService: GoogleAuthService,
    private readonly appleAuthService: AppleAuthService,
    private readonly configService: ConfigService,
  ) {}

  @Post("register")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.CREATED)
  async register(
    @Body() dto: RegisterDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: CustomerProfile; token?: string; success: boolean }> {
    const result = await this.authService.register(dto, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    if (result.rawToken) {
      res.cookie(
        "fvd_session",
        result.rawToken,
        this.authService.getCookieOptions(),
      );
    }

    return {
      user: result.user!,
      token: result.rawToken || undefined,
      success: true,
    };
  }

  @Post("login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async login(
    @Body() dto: LoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    user?: CustomerProfile;
    token?: string;
    requiresTwoFactor?: boolean;
    challenge?: string;
    success: boolean;
  }> {
    const result = await this.authService.login(dto, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    // If 2FA is required, return temporary challenge without creating session cookie
    if (result.requiresTwoFactor) {
      return {
        requiresTwoFactor: true,
        challenge: result.challenge,
        success: true,
      };
    }

    if (result.rawToken) {
      res.cookie(
        "fvd_session",
        result.rawToken,
        this.authService.getCookieOptions(),
      );
    }

    return {
      user: result.user!,
      token: result.rawToken || undefined,
      requiresTwoFactor: false,
      success: true,
    };
  }

  @Get("me")
  @UseGuards(AuthGuard)
  async getMe(@CurrentUser() user: CustomerProfile): Promise<CustomerProfile> {
    return this.authService.getProfile(user.id);
  }

  @Post("logout")
  @HttpCode(HttpStatus.OK)
  async logout(
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ success: boolean; message: string }> {
    const token =
      req.cookies?.["fvd_session"] ||
      req.signedCookies?.["fvd_session"] ||
      (req.headers["authorization"]?.startsWith("Bearer ")
        ? req.headers["authorization"].substring(7)
        : null);

    if (token) {
      await this.authService.logout(token);
    }

    const cookieOptions = this.authService.getCookieOptions();
    res.clearCookie("fvd_session", {
      ...cookieOptions,
      maxAge: 0,
    });

    return {
      success: true,
      message: "Logged out successfully.",
    };
  }

  // ---------------------------------------------------------------------------
  // Two-Factor Authentication (TOTP) Endpoints
  // ---------------------------------------------------------------------------

  @Post("2fa/setup")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async setup2FA(
    @CurrentUser() user: CustomerProfile,
  ): Promise<TwoFactorSetupResponse> {
    return this.twoFactorService.generateSetup(user.id);
  }

  @Post("2fa/verify-setup")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async verify2FASetup(
    @CurrentUser() user: CustomerProfile,
    @Body() dto: Verify2FASetupDto,
  ): Promise<{ success: boolean; recoveryCodes: string[]; message: string }> {
    return this.twoFactorService.verifySetup(user.id, dto.code);
  }

  @Post("2fa/verify-login")
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async verify2FALogin(
    @Body() dto: Verify2FALoginDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: CustomerProfile; token?: string; success: boolean }> {
    const { userId } = await this.twoFactorService.verifyLogin(
      dto.challenge,
      dto.code,
    );

    // Create real authenticated session with cookie
    const session = await this.authService.establishSessionForUser(userId, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.cookie(
      "fvd_session",
      session.rawToken,
      this.authService.getCookieOptions(),
    );

    return {
      user: session.user,
      token: session.rawToken || undefined,
      success: true,
    };
  }

  @Post("2fa/recovery")
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async verify2FARecovery(
    @Body() dto: Verify2FARecoveryDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{ user: CustomerProfile; token?: string; success: boolean }> {
    const { userId } = await this.twoFactorService.verifyRecoveryLogin(
      dto.challenge,
      dto.recoveryCode,
    );

    // Create real authenticated session with cookie
    const session = await this.authService.establishSessionForUser(userId, {
      ip: req.ip,
      userAgent: req.headers["user-agent"],
    });

    res.cookie(
      "fvd_session",
      session.rawToken,
      this.authService.getCookieOptions(),
    );

    return {
      user: session.user,
      token: session.rawToken || undefined,
      success: true,
    };
  }

  @Post("2fa/disable")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async disable2FA(
    @CurrentUser() user: CustomerProfile,
    @Body() dto: Disable2FADto,
  ): Promise<{ success: boolean; message: string }> {
    return this.twoFactorService.disable(user.id, dto.password, dto.code);
  }

  @Post("2fa/recovery-codes/regenerate")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async regenerateRecoveryCodes(
    @CurrentUser() user: CustomerProfile,
    @Body() dto: RegenerateRecoveryCodesDto,
  ): Promise<{ success: boolean; recoveryCodes: string[]; message: string }> {
    return this.twoFactorService.regenerateRecoveryCodes(
      user.id,
      dto.password,
      dto.code,
    );
  }

  @Get("2fa/status")
  @UseGuards(AuthGuard)
  async get2FAStatus(
    @CurrentUser() user: CustomerProfile,
  ): Promise<TwoFactorStatusResponse> {
    return this.twoFactorService.getStatus(user.id);
  }

  // ---------------------------------------------------------------------------
  // Google OAuth 2.0 / OpenID Connect Endpoints
  // ---------------------------------------------------------------------------

  /**
   * Initiate Google OAuth flow with cryptographically signed state token.
   */
  @Get("google")
  @UseGuards(OptionalAuthGuard)
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async googleAuth(
    @Query("returnTo") returnTo: string | undefined,
    @Query("action") action: string | undefined,
    @CurrentUser() user: CustomerProfile | null,
    @Res() res: Response,
  ): Promise<void> {
    const linkingUserId = action === "link" && user ? user.id : undefined;
    const { authUrl, stateNonce } = this.googleAuthService.generateAuthUrl(
      returnTo,
      linkingUserId,
    );

    // Set state nonce in HTTP-only cookie for CSRF validation
    res.cookie("fvd_oauth_state", stateNonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 10 * 60 * 1000,
      path: "/",
    });

    res.redirect(authUrl);
  }

  /**
   * Google OAuth Callback handler.
   */
  @Get("google/callback")
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  async googleAuthCallback(
    @Query("code") code: string | undefined,
    @Query("state") state: string | undefined,
    @Query("error") oauthError: string | undefined,
    @Req() req: Request,
    @Res() res: Response,
  ): Promise<void> {
    let frontendUrl = "http://localhost:3000";
    try {
      const corsOrigins = this.configService.get<string[] | string>(
        "cors.origin",
        ["http://localhost:3000"],
      );
      frontendUrl = (
        Array.isArray(corsOrigins)
          ? corsOrigins[0] || "http://localhost:3000"
          : typeof corsOrigins === "string"
            ? corsOrigins.split(",")[0] || "http://localhost:3000"
            : "http://localhost:3000"
      ).trim();

      // 1. Handle user cancellation or provider error
      if (oauthError) {
        this.logger.warn(`Google OAuth error returned: ${oauthError}`);
        res.clearCookie("fvd_oauth_state", { path: "/" });
        return res.redirect(`${frontendUrl}/login?error=oauth_cancelled`);
      }

      // 2. Validate state token and cookie nonce against CSRF
      const cookieNonce =
        req.cookies?.["fvd_oauth_state"] ||
        req.signedCookies?.["fvd_oauth_state"];
      res.clearCookie("fvd_oauth_state", { path: "/" });

      let statePayload: any;
      try {
        statePayload = this.googleAuthService.validateState(
          state || "",
          cookieNonce,
        );
      } catch (err: any) {
        this.logger.warn(`OAuth state validation failed: ${err.message}`);
        return res.redirect(`${frontendUrl}/login?error=oauth_state_invalid`);
      }

      const safeReturnTo = sanitizeReturnUrl(statePayload.returnTo);

      // 3. Exchange authorization code with Google for verified profile
      let profile: any;
      try {
        profile = await this.googleAuthService.exchangeCodeAndFetchProfile(
          code || "",
        );
      } catch (err: any) {
        this.logger.error(`Google profile fetch failed: ${err.message}`);
        return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
      }

      // 4. Process identity according to strict account linking rules
      try {
        const result = await this.googleAuthService.handleGoogleIdentity(
          profile,
          {
            ip: req.ip,
            userAgent: req.headers["user-agent"],
          },
          statePayload.linkingUserId,
        );

        // Account collision (unlinked Google account with existing email) -> require password sign-in
        if (result.conflictError) {
          const redirectParams = new URLSearchParams({
            error: "account_exists_link_required",
            email: profile.email,
            returnTo: safeReturnTo,
          });
          return res.redirect(
            `${frontendUrl}/login?${redirectParams.toString()}`,
          );
        }

        // Explicit linking from Account Settings
        if (result.isLinked) {
          return res.redirect(`${frontendUrl}/account?google=linked`);
        }

        // 2FA required -> redirect to login with challenge
        if (result.requiresTwoFactor) {
          const redirectParams = new URLSearchParams({
            requires2fa: "true",
            challenge: result.challenge || "",
            returnTo: safeReturnTo,
          });
          return res.redirect(
            `${frontendUrl}/login?${redirectParams.toString()}`,
          );
        }

        // Normal session creation
        if (result.rawToken) {
          res.cookie(
            "fvd_session",
            result.rawToken,
            this.authService.getCookieOptions(),
          );
        }

        return res.redirect(`${frontendUrl}${safeReturnTo}`);
      } catch (err: any) {
        this.logger.error(`Google login handling failed: ${err.message}`);
        return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
      }
    } catch (unexpectedErr: any) {
      this.logger.error(
        `Unexpected error in googleAuthCallback: ${unexpectedErr?.message}`,
        unexpectedErr?.stack,
      );
      return res.redirect(`${frontendUrl}/login?error=oauth_failed`);
    }
  }

  /**
   * Native Google Sign-In / Token Verification for Mobile Apps.
   */
  @Post("google/native")
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async nativeGoogleAuth(
    @Body() dto: NativeGoogleAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    user?: CustomerProfile | null;
    token?: string | null;
    requiresTwoFactor?: boolean;
    challenge?: string;
    isLinked?: boolean;
    conflictError?: boolean;
    message?: string;
    success: boolean;
  }> {
    const result = await this.googleAuthService.verifyNativeGoogleToken(
      dto.idToken,
      {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
    );

    if (result.conflictError) {
      return {
        success: false,
        conflictError: true,
        message:
          "An account already exists with this email address. Please sign in with password first.",
      };
    }

    if (result.requiresTwoFactor) {
      return {
        success: true,
        requiresTwoFactor: true,
        challenge: result.challenge,
      };
    }

    if (result.rawToken) {
      res.cookie(
        "fvd_session",
        result.rawToken,
        this.authService.getCookieOptions(),
      );
    }

    return {
      success: true,
      user: result.user,
      token: result.rawToken || undefined,
      isLinked: result.isLinked,
    };
  }

  /**
   * Native Sign in with Apple for iOS Mobile Apps.
   */
  @Post("apple/native")
  @Throttle({ default: { limit: 15, ttl: 60000 } })
  @HttpCode(HttpStatus.OK)
  async nativeAppleAuth(
    @Body() dto: NativeAppleAuthDto,
    @Req() req: Request,
    @Res({ passthrough: true }) res: Response,
  ): Promise<{
    user?: CustomerProfile | null;
    token?: string | null;
    requiresTwoFactor?: boolean;
    challenge?: string;
    isLinked?: boolean;
    message?: string;
    success: boolean;
  }> {
    const result = await this.appleAuthService.verifyNativeAppleToken(
      dto.identityToken,
      dto.fullName,
      dto.email,
      {
        ip: req.ip,
        userAgent: req.headers["user-agent"],
      },
    );

    if (result.requiresTwoFactor) {
      return {
        success: true,
        requiresTwoFactor: true,
        challenge: result.challenge,
      };
    }

    if (result.rawToken) {
      res.cookie(
        "fvd_session",
        result.rawToken,
        this.authService.getCookieOptions(),
      );
    }

    return {
      success: true,
      user: result.user,
      token: result.rawToken || undefined,
      isLinked: result.isLinked,
    };
  }

  /**
   * Disconnect Google account from authenticated customer profile.
   */
  @Post("google/unlink")
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.OK)
  async unlinkGoogle(
    @CurrentUser() user: CustomerProfile,
  ): Promise<{ success: boolean; message: string }> {
    return this.googleAuthService.unlinkGoogle(user.id);
  }

  /**
   * Get connected OAuth providers for authenticated customer.
   */
  @Get("connected-accounts")
  @UseGuards(AuthGuard)
  async getConnectedAccounts(
    @CurrentUser() user: CustomerProfile,
  ): Promise<ConnectedAccountsResponse> {
    return this.googleAuthService.getConnectedAccounts(user.id);
  }
}
