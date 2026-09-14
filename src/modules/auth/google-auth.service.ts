import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { AuthService } from "./auth.service";
import { TwoFactorService } from "./two-factor.service";
import * as crypto from "crypto";
import { UserRole as PrismaUserRole } from "@prisma/client";
import { ConnectedAccountsResponse } from "../../types";

export interface GoogleProfile {
  sub: string;
  email: string;
  emailVerified: boolean;
  name?: string;
  picture?: string;
}

export interface OAuthStatePayload {
  nonce: string;
  returnTo: string;
  linkingUserId?: string | null;
  createdAt: number;
}

export function sanitizeReturnUrl(returnTo?: string | null): string {
  if (!returnTo || typeof returnTo !== "string") {
    return "/account";
  }
  const trimmed = returnTo.trim();
  if (
    trimmed.startsWith("/") &&
    !trimmed.startsWith("//") &&
    !trimmed.includes("://") &&
    !trimmed.includes("\\") &&
    /^\/[a-zA-Z0-9_\-\/\?=&%#]*$/.test(trimmed)
  ) {
    return trimmed;
  }
  return "/account";
}

@Injectable()
export class GoogleAuthService {
  private readonly logger = new Logger(GoogleAuthService.name);
  private readonly clientId: string;
  private readonly clientSecret: string;
  private readonly callbackUrl: string;
  private readonly stateSecret: string;
  private readonly STATE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(forwardRef(() => TwoFactorService))
    private readonly twoFactorService: TwoFactorService,
  ) {
    this.clientId = this.configService.get<string>("google.clientId", "");
    this.clientSecret = this.configService.get<string>(
      "google.clientSecret",
      "",
    );
    this.callbackUrl = this.configService.get<string>(
      "google.callbackUrl",
      "http://localhost:4000/api/auth/google/callback",
    );
    this.stateSecret = this.configService.get<string>(
      "jwt.secret",
      "dev_state_secret",
    );
  }

  /**
   * Generate Google OAuth authorization URL and state token.
   */
  generateAuthUrl(
    returnTo?: string,
    linkingUserId?: string,
  ): { authUrl: string; stateToken: string; stateNonce: string } {
    const safeReturnTo = sanitizeReturnUrl(returnTo);
    const stateNonce = crypto.randomBytes(24).toString("hex");

    const payload: OAuthStatePayload = {
      nonce: stateNonce,
      returnTo: safeReturnTo,
      linkingUserId: linkingUserId || null,
      createdAt: Date.now(),
    };

    const stateToken = this.signState(payload);

    const scopes = ["openid", "email", "profile"].join(" ");

    const params = new URLSearchParams({
      client_id: this.clientId,
      redirect_uri: this.callbackUrl,
      response_type: "code",
      scope: scopes,
      state: stateToken,
      access_type: "online",
      prompt: "select_account",
    });

    const authUrl = `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`;

    return { authUrl, stateToken, stateNonce };
  }

  /**
   * Validate cryptographically signed OAuth state token against CSRF.
   */
  validateState(
    stateToken: string,
    expectedCookieNonce?: string,
  ): OAuthStatePayload {
    if (!stateToken || typeof stateToken !== "string") {
      throw new UnauthorizedException("Missing OAuth state parameter.");
    }

    const payload = this.verifyState(stateToken);
    if (!payload) {
      throw new UnauthorizedException("Invalid or tampered OAuth state.");
    }

    // Check expiration
    if (Date.now() - payload.createdAt > this.STATE_TTL_MS) {
      throw new UnauthorizedException(
        "OAuth state has expired. Please try again.",
      );
    }

    // Verify against cookie nonce if present
    if (expectedCookieNonce && payload.nonce !== expectedCookieNonce) {
      throw new UnauthorizedException("OAuth state mismatch (possible CSRF).");
    }

    return payload;
  }

  /**
   * Exchange authorization code for tokens and fetch verified OpenID Connect profile.
   */
  async exchangeCodeAndFetchProfile(code: string): Promise<GoogleProfile> {
    if (!code || typeof code !== "string") {
      throw new BadRequestException("Authorization code is required.");
    }

    if (!this.clientId || !this.clientSecret) {
      this.logger.error(
        "Google OAuth credentials are not configured in environment.",
      );
      throw new BadRequestException(
        "Google sign-in is not configured on this server.",
      );
    }

    try {
      // 1. Exchange code at Google token endpoint
      const tokenResponse = await fetch("https://oauth2.googleapis.com/token", {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          code: code.trim(),
          client_id: this.clientId,
          client_secret: this.clientSecret,
          redirect_uri: this.callbackUrl,
          grant_type: "authorization_code",
        }),
      });

      if (!tokenResponse.ok) {
        const errBody = await tokenResponse.text();
        this.logger.warn(`Google token exchange rejected: ${errBody}`);
        throw new BadRequestException(
          "Failed to verify authorization code with Google.",
        );
      }

      const tokens = await tokenResponse.json();
      const accessToken = tokens.access_token;

      if (!accessToken) {
        throw new BadRequestException("Google did not return an access token.");
      }

      // 2. Fetch OpenID Connect userinfo
      const userinfoResponse = await fetch(
        "https://openidconnect.googleapis.com/v1/userinfo",
        {
          headers: { Authorization: `Bearer ${accessToken}` },
        },
      );

      if (!userinfoResponse.ok) {
        throw new BadRequestException(
          "Failed to retrieve user profile from Google.",
        );
      }

      const userinfo = await userinfoResponse.json();

      if (!userinfo.sub) {
        throw new BadRequestException("Invalid identity returned from Google.");
      }

      if (!userinfo.email) {
        throw new BadRequestException(
          "No email address returned from Google account.",
        );
      }

      const emailVerified =
        userinfo.email_verified === true || userinfo.email_verified === "true";

      if (!emailVerified) {
        throw new BadRequestException(
          "Your Google email is not verified. Please verify your Google account email.",
        );
      }

      return {
        sub: String(userinfo.sub),
        email: String(userinfo.email).toLowerCase().trim(),
        emailVerified: true,
        name: userinfo.name || userinfo.given_name || "Customer",
        picture: userinfo.picture || undefined,
      };
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Error during Google profile exchange: ${err.message}`);
      throw new BadRequestException(
        "Google authentication failed. Please try again.",
      );
    }
  }

  /**
   * Process verified Google identity according to strict account linking rules.
   */
  async handleGoogleIdentity(
    profile: GoogleProfile,
    reqInfo?: { ip?: string; userAgent?: string },
    linkingUserId?: string | null,
  ): Promise<{
    user?: any;
    rawToken?: string | null;
    requiresTwoFactor?: boolean;
    challenge?: string;
    isLinked?: boolean;
    conflictError?: string;
  }> {
    // -------------------------------------------------------------------------
    // Scenario A: User is explicitly linking Google from Account Settings
    // -------------------------------------------------------------------------
    if (linkingUserId) {
      const existingLink = await this.prisma.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "google",
            providerAccountId: profile.sub,
          },
        },
      });

      if (existingLink && existingLink.userId !== linkingUserId) {
        throw new BadRequestException(
          "This Google account is already linked to another customer account.",
        );
      }

      if (!existingLink) {
        await this.prisma.oAuthAccount.create({
          data: {
            userId: linkingUserId,
            provider: "google",
            providerAccountId: profile.sub,
          },
        });
        this.logger.log(
          `Google account [sub: ${profile.sub}] successfully linked to user [ID: ${linkingUserId}]`,
        );
      }

      const user = await this.prisma.user.findUnique({
        where: { id: linkingUserId },
        include: { twoFactorAuth: { select: { enabled: true } } },
      });

      return {
        user: this.authService.mapUserToProfile(
          user,
          user?.twoFactorAuth?.enabled || false,
        ),
        isLinked: true,
      };
    }

    // -------------------------------------------------------------------------
    // Scenario B: Normal "Continue with Google" Sign-In / Registration
    // -------------------------------------------------------------------------

    // Case 1: Google account already linked
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "google",
          providerAccountId: profile.sub,
        },
      },
      include: {
        user: {
          include: {
            twoFactorAuth: { select: { enabled: true } },
          },
        },
      },
    });

    if (existingOAuth && existingOAuth.user) {
      const user = existingOAuth.user;

      if (!user.isActive) {
        throw new UnauthorizedException(
          "Account is disabled. Please contact dhaba support.",
        );
      }

      // Check if user has TOTP enabled -> enforce 2FA policy
      if (user.twoFactorAuth && user.twoFactorAuth.enabled) {
        const challenge = await this.twoFactorService.createLoginChallenge(
          user.id,
        );
        this.logger.log(
          `2FA challenge issued for Google sign-in: [ID: ${user.id}]`,
        );
        return {
          requiresTwoFactor: true,
          challenge,
          user: null,
          rawToken: null,
        };
      }

      const rawToken = await this.authService.createSession(user.id, reqInfo);
      this.logger.log(`Customer signed in via Google: [ID: ${user.id}]`);

      return {
        user: this.authService.mapUserToProfile(user, false),
        rawToken,
        requiresTwoFactor: false,
      };
    }

    // Case 2: Google account not linked, but email belongs to an existing account
    const existingUserWithEmail = await this.prisma.user.findUnique({
      where: { email: profile.email },
    });

    if (existingUserWithEmail) {
      this.logger.warn(
        `Google login attempt with existing unlinked email: ${profile.email}. Denying automatic linking.`,
      );
      return {
        conflictError: "account_exists_link_required",
      };
    }

    // Case 3: No existing account -> Create new customer account with CUSTOMER role
    const newUser = await this.prisma.user.create({
      data: {
        name: profile.name?.trim() || "Customer",
        email: profile.email,
        phone: null,
        passwordHash: null,
        role: PrismaUserRole.CUSTOMER,
        isActive: true,
        oauthAccounts: {
          create: {
            provider: "google",
            providerAccountId: profile.sub,
          },
        },
      },
      include: {
        twoFactorAuth: { select: { enabled: true } },
      },
    });

    this.logger.log(
      `New customer registered via Google: [ID: ${newUser.id}, Email: ${newUser.email}]`,
    );

    const rawToken = await this.authService.createSession(newUser.id, reqInfo);

    return {
      user: this.authService.mapUserToProfile(newUser, false),
      rawToken,
      requiresTwoFactor: false,
    };
  }

  /**
   * Unlink Google OAuth provider from account.
   */
  async unlinkGoogle(
    userId: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { oauthAccounts: true },
    });

    if (!user) {
      throw new BadRequestException("User not found.");
    }

    const hasGoogle = user.oauthAccounts.some((a) => a.provider === "google");
    if (!hasGoogle) {
      throw new BadRequestException("No Google account is currently linked.");
    }

    // Prevent account lockout if Google is the only auth method
    if (!user.passwordHash && user.oauthAccounts.length <= 1) {
      throw new BadRequestException(
        "Cannot disconnect Google account. Please set an account password first to avoid losing access.",
      );
    }

    await this.prisma.oAuthAccount.deleteMany({
      where: {
        userId,
        provider: "google",
      },
    });

    this.logger.log(`Google account unlinked for user: [ID: ${userId}]`);

    return {
      success: true,
      message: "Google account has been successfully disconnected.",
    };
  }

  /**
   * Get connected accounts status for a user.
   */
  async getConnectedAccounts(
    userId: string,
  ): Promise<ConnectedAccountsResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { oauthAccounts: true },
    });

    if (!user) {
      throw new BadRequestException("User not found.");
    }

    const googleAccount = user.oauthAccounts.find(
      (a) => a.provider === "google",
    );

    return {
      hasPassword: !!user.passwordHash,
      google: {
        connected: !!googleAccount,
        providerAccountId: googleAccount
          ? googleAccount.providerAccountId
          : null,
      },
    };
  }

  /**
   * Verify native Google ID Token sent from mobile app (Android / iOS)
   */
  async verifyNativeGoogleToken(
    idToken: string,
    reqInfo?: { ip?: string; userAgent?: string },
    linkingUserId?: string | null,
  ): Promise<{
    user?: any;
    rawToken?: string | null;
    requiresTwoFactor?: boolean;
    challenge?: string;
    isLinked?: boolean;
    conflictError?: string;
  }> {
    if (!idToken || !idToken.trim()) {
      throw new BadRequestException("Google ID Token is required.");
    }

    try {
      const tokeninfoRes = await fetch(
        `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken.trim())}`,
        { method: "GET" },
      );

      if (!tokeninfoRes.ok) {
        const errorJson = await tokeninfoRes.json().catch(() => ({}));
        this.logger.warn(
          `Google tokeninfo verification failed: ${JSON.stringify(errorJson)}`,
        );
        throw new BadRequestException(
          "Invalid or expired Google identity token.",
        );
      }

      const payload = await tokeninfoRes.json();

      if (!payload.sub || !payload.email) {
        throw new BadRequestException("Invalid Google token payload.");
      }

      const emailVerified =
        payload.email_verified === true ||
        payload.email_verified === "true" ||
        payload.email_verified === "1";

      if (!emailVerified) {
        throw new BadRequestException("Google email address is not verified.");
      }

      const profile: GoogleProfile = {
        sub: String(payload.sub),
        email: String(payload.email).toLowerCase().trim(),
        emailVerified: true,
        name: payload.name || payload.given_name || "Customer",
        picture: payload.picture || undefined,
      };

      return this.handleGoogleIdentity(profile, reqInfo, linkingUserId);
    } catch (err: any) {
      if (
        err instanceof BadRequestException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }
      this.logger.error(`Error verifying native Google token: ${err.message}`);
      throw new BadRequestException("Google authentication failed.");
    }
  }

  // ---------------------------------------------------------------------------
  // Internal State Cryptographic Helpers
  // ---------------------------------------------------------------------------

  private signState(payload: OAuthStatePayload): string {
    const jsonStr = JSON.stringify(payload);
    const b64Payload = Buffer.from(jsonStr, "utf8").toString("base64url");
    const hmac = crypto
      .createHmac("sha256", this.stateSecret)
      .update(b64Payload)
      .digest("base64url");
    return `${b64Payload}.${hmac}`;
  }

  private verifyState(stateToken: string): OAuthStatePayload | null {
    try {
      const parts = stateToken.split(".");
      if (parts.length !== 2) return null;

      const [b64Payload, hmac] = parts;
      if (!b64Payload || !hmac) return null;

      const expectedHmac = crypto
        .createHmac("sha256", this.stateSecret)
        .update(b64Payload)
        .digest("base64url");

      const isValid = crypto.timingSafeEqual(
        Buffer.from(hmac, "utf8"),
        Buffer.from(expectedHmac, "utf8"),
      );

      if (!isValid) return null;

      const jsonStr = Buffer.from(b64Payload, "base64url").toString("utf8");
      return JSON.parse(jsonStr) as OAuthStatePayload;
    } catch {
      return null;
    }
  }
}
