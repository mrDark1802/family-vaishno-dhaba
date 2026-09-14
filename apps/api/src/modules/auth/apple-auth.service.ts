import {
  Injectable,
  BadRequestException,
  UnauthorizedException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { AuthService } from "./auth.service";
import { TwoFactorService } from "./two-factor.service";
import { UserRole as PrismaUserRole } from "@prisma/client";

export interface AppleProfile {
  sub: string;
  email?: string | null;
  name?: string | null;
}

@Injectable()
export class AppleAuthService {
  private readonly logger = new Logger(AppleAuthService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => AuthService))
    private readonly authService: AuthService,
    @Inject(forwardRef(() => TwoFactorService))
    private readonly twoFactorService: TwoFactorService,
  ) {}

  /**
   * Verify Apple identity token and process login/registration.
   */
  async verifyNativeAppleToken(
    identityToken: string,
    providedFullName?: string | null,
    providedEmail?: string | null,
    reqInfo?: { ip?: string; userAgent?: string },
    linkingUserId?: string | null,
  ): Promise<{
    user?: any;
    rawToken?: string | null;
    requiresTwoFactor?: boolean;
    challenge?: string;
    isLinked?: boolean;
  }> {
    if (!identityToken || !identityToken.trim()) {
      throw new BadRequestException("Apple Identity Token is required.");
    }

    try {
      // Decode JWT payload without third-party library dependency
      const parts = identityToken.trim().split(".");
      if (parts.length !== 3) {
        throw new BadRequestException("Malformed Apple identity token.");
      }

      const payloadJson = Buffer.from(parts[1], "base64url").toString("utf8");
      const payload = JSON.parse(payloadJson);

      if (!payload.sub) {
        throw new BadRequestException("Invalid Apple token claims: missing sub.");
      }

      if (payload.iss !== "https://appleid.apple.com") {
        throw new BadRequestException("Invalid Apple token issuer.");
      }

      const now = Math.floor(Date.now() / 1000);
      if (payload.exp && payload.exp < now) {
        throw new BadRequestException("Apple identity token has expired.");
      }

      const sub = String(payload.sub);
      const email = payload.email
        ? String(payload.email).toLowerCase().trim()
        : providedEmail
          ? providedEmail.toLowerCase().trim()
          : null;

      const profile: AppleProfile = {
        sub,
        email,
        name: providedFullName || "Apple Customer",
      };

      return this.handleAppleIdentity(profile, reqInfo, linkingUserId);
    } catch (err: any) {
      if (
        err instanceof BadRequestException ||
        err instanceof UnauthorizedException
      ) {
        throw err;
      }
      this.logger.error(`Error verifying Apple token: ${err.message}`);
      throw new BadRequestException("Sign in with Apple failed.");
    }
  }

  /**
   * Handle verified Apple identity.
   */
  async handleAppleIdentity(
    profile: AppleProfile,
    reqInfo?: { ip?: string; userAgent?: string },
    linkingUserId?: string | null,
  ): Promise<{
    user?: any;
    rawToken?: string | null;
    requiresTwoFactor?: boolean;
    challenge?: string;
    isLinked?: boolean;
  }> {
    // 1. Explicit linking to existing logged-in user
    if (linkingUserId) {
      const existingLink = await this.prisma.oAuthAccount.findUnique({
        where: {
          provider_providerAccountId: {
            provider: "apple",
            providerAccountId: profile.sub,
          },
        },
      });

      if (existingLink && existingLink.userId !== linkingUserId) {
        throw new BadRequestException(
          "This Apple account is already linked to another customer account.",
        );
      }

      if (!existingLink) {
        await this.prisma.oAuthAccount.create({
          data: {
            userId: linkingUserId,
            provider: "apple",
            providerAccountId: profile.sub,
          },
        });
        this.logger.log(
          `Apple account [sub: ${profile.sub}] linked to user [ID: ${linkingUserId}]`,
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

    // 2. Normal Sign In / Sign Up
    const existingOAuth = await this.prisma.oAuthAccount.findUnique({
      where: {
        provider_providerAccountId: {
          provider: "apple",
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

      if (user.twoFactorAuth && user.twoFactorAuth.enabled) {
        const challenge = await this.twoFactorService.createLoginChallenge(
          user.id,
        );
        return {
          requiresTwoFactor: true,
          challenge,
          user: null,
          rawToken: null,
        };
      }

      const rawToken = await this.authService.createSession(user.id, reqInfo);
      return {
        user: this.authService.mapUserToProfile(user, false),
        rawToken,
      };
    }

    // 3. Match by email if available
    if (profile.email) {
      const existingUserByEmail = await this.prisma.user.findUnique({
        where: { email: profile.email },
        include: { twoFactorAuth: { select: { enabled: true } } },
      });

      if (existingUserByEmail) {
        await this.prisma.oAuthAccount.create({
          data: {
            userId: existingUserByEmail.id,
            provider: "apple",
            providerAccountId: profile.sub,
          },
        });

        if (
          existingUserByEmail.twoFactorAuth &&
          existingUserByEmail.twoFactorAuth.enabled
        ) {
          const challenge = await this.twoFactorService.createLoginChallenge(
            existingUserByEmail.id,
          );
          return {
            requiresTwoFactor: true,
            challenge,
            user: null,
            rawToken: null,
          };
        }

        const rawToken = await this.authService.createSession(
          existingUserByEmail.id,
          reqInfo,
        );
        return {
          user: this.authService.mapUserToProfile(existingUserByEmail, false),
          rawToken,
        };
      }
    }

    // 4. Create new user for first-time Apple user
    const newUser = await this.prisma.user.create({
      data: {
        name: profile.name || "Apple Customer",
        email: profile.email || null,
        phone: null,
        role: PrismaUserRole.CUSTOMER,
        isActive: true,
        oauthAccounts: {
          create: {
            provider: "apple",
            providerAccountId: profile.sub,
          },
        },
      },
    });

    this.logger.log(`Created new customer account via Apple [ID: ${newUser.id}]`);
    const rawToken = await this.authService.createSession(newUser.id, reqInfo);

    return {
      user: this.authService.mapUserToProfile(newUser, false),
      rawToken,
    };
  }
}
