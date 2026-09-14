import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { TwoFactorService } from "./two-factor.service";
import { RegisterDto } from "./dto/register.dto";
import { LoginDto } from "./dto/login.dto";
import { CustomerProfile, UserRole } from "../../types";
import * as argon2 from "argon2";
import * as crypto from "crypto";
import { User, UserRole as PrismaUserRole } from "@prisma/client";

export interface SessionResult {
  user: CustomerProfile | null;
  rawToken: string | null;
  requiresTwoFactor?: boolean;
  challenge?: string;
}

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);
  private readonly SESSION_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => TwoFactorService))
    private readonly twoFactorService: TwoFactorService,
  ) {}

  /**
   * Register a new customer account
   */
  async register(
    dto: RegisterDto,
    reqInfo?: { ip?: string; userAgent?: string },
  ): Promise<SessionResult> {
    const normalizedPhone = this.normalizePhone(dto.phone);
    const normalizedEmail = dto.email ? dto.email.toLowerCase().trim() : null;

    // Check uniqueness for phone and email
    const existingUser = await this.prisma.user.findFirst({
      where: {
        OR: [
          { phone: normalizedPhone },
          ...(normalizedEmail ? [{ email: normalizedEmail }] : []),
        ],
      },
    });

    if (existingUser) {
      throw new BadRequestException(
        "An account with this mobile number or email already exists. Please sign in.",
      );
    }

    // Hash password with Argon2id
    const passwordHash = await argon2.hash(dto.password, {
      type: argon2.argon2id,
      memoryCost: 65536,
      timeCost: 3,
    });

    // Create user strictly with CUSTOMER role
    const user = await this.prisma.user.create({
      data: {
        name: dto.name.trim(),
        phone: normalizedPhone,
        email: normalizedEmail,
        passwordHash,
        role: PrismaUserRole.CUSTOMER,
        isActive: true,
      },
    });

    this.logger.log(`New customer registered: [ID: ${user.id}]`);

    // Create authenticated session
    const rawToken = await this.createSession(user.id, reqInfo);

    return {
      user: this.mapUserToProfile(user, false),
      rawToken,
    };
  }

  /**
   * Login customer with mobile number or email
   */
  async login(
    dto: LoginDto,
    reqInfo?: { ip?: string; userAgent?: string },
  ): Promise<SessionResult> {
    const identifier = dto.identifier.trim();
    const isEmail = identifier.includes("@");

    let user: any = null;

    if (isEmail) {
      user = await this.prisma.user.findUnique({
        where: { email: identifier.toLowerCase() },
        include: {
          twoFactorAuth: { select: { enabled: true } },
          oauthAccounts: { select: { provider: true } },
        },
      });
    } else {
      const normalizedPhone = this.normalizePhone(identifier);
      user = await this.prisma.user.findUnique({
        where: { phone: normalizedPhone },
        include: {
          twoFactorAuth: { select: { enabled: true } },
          oauthAccounts: { select: { provider: true } },
        },
      });
    }

    if (!user || !user.passwordHash) {
      // Avoid account enumeration with constant time response
      await this.fakeHashVerification();
      throw new UnauthorizedException(
        "Invalid mobile number/email or password.",
      );
    }

    // Verify password with Argon2id
    const isPasswordValid = await argon2.verify(
      user.passwordHash,
      dto.password,
    );

    if (!isPasswordValid) {
      throw new UnauthorizedException(
        "Invalid mobile number/email or password.",
      );
    }

    if (!user.isActive) {
      throw new UnauthorizedException(
        "Account is inactive. Please contact dhaba support.",
      );
    }

    // Check if 2FA is enabled
    if (user.twoFactorAuth && user.twoFactorAuth.enabled) {
      const challenge = await this.twoFactorService.createLoginChallenge(
        user.id,
      );
      this.logger.log(`2FA challenge issued for user: [ID: ${user.id}]`);
      return {
        user: null,
        rawToken: null,
        requiresTwoFactor: true,
        challenge,
      };
    }

    // Create authenticated session
    const rawToken = await this.createSession(user.id, reqInfo);

    return {
      user: this.mapUserToProfile(user, false),
      rawToken,
    };
  }

  /**
   * Establish a full authenticated session after 2FA verification
   */
  async establishSessionForUser(
    userId: string,
    reqInfo?: { ip?: string; userAgent?: string },
  ): Promise<{ user: CustomerProfile; rawToken: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        twoFactorAuth: { select: { enabled: true } },
        oauthAccounts: { select: { provider: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found or inactive.");
    }

    const rawToken = await this.createSession(user.id, reqInfo);

    return {
      user: this.mapUserToProfile(user, user.twoFactorAuth?.enabled || false),
      rawToken,
    };
  }

  /**
   * Get safe public profile of authenticated user
   */
  async getProfile(userId: string): Promise<CustomerProfile> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId, isActive: true },
      include: {
        twoFactorAuth: { select: { enabled: true } },
        oauthAccounts: { select: { provider: true } },
      },
    });

    if (!user) {
      throw new UnauthorizedException("User not found or inactive.");
    }

    return this.mapUserToProfile(user, user.twoFactorAuth?.enabled || false);
  }

  /**
   * Invalidate session and log out
   */
  async logout(rawToken: string): Promise<void> {
    if (!rawToken) return;

    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    await this.prisma.session
      .deleteMany({
        where: { tokenHash },
      })
      .catch(() => {});
  }

  /**
   * Create opaque crypto session record in PostgreSQL
   */
  public async createSession(
    userId: string,
    reqInfo?: { ip?: string; userAgent?: string },
  ): Promise<string> {
    const rawToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + this.SESSION_TTL_MS);

    await this.prisma.session.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
        ipAddress: reqInfo?.ip || null,
        userAgent: reqInfo?.userAgent
          ? reqInfo.userAgent.substring(0, 255)
          : null,
      },
    });

    return rawToken;
  }

  /**
   * Normalize 10-digit Indian phone number
   */
  private normalizePhone(phone: string): string {
    const cleaned = phone.replace(/[\s-]/g, "");
    if (cleaned.startsWith("+91")) {
      return cleaned.slice(3);
    }
    if (cleaned.startsWith("91") && cleaned.length === 12) {
      return cleaned.slice(2);
    }
    return cleaned;
  }

  /**
   * Map Prisma User to safe CustomerProfile
   */
  public mapUserToProfile(
    user: any,
    isTwoFactorEnabled: boolean = false,
  ): CustomerProfile {
    return {
      id: user.id,
      name: user.name || "Customer",
      phone: user.phone || null,
      email: user.email || null,
      role: user.role as UserRole,
      isTwoFactorEnabled,
      hasPassword: !!user.passwordHash,
      connectedProviders: user.oauthAccounts?.map((a: any) => a.provider) || [],
    };
  }

  /**
   * Dummy hash verification to mitigate timing attacks
   */
  private async fakeHashVerification(): Promise<void> {
    try {
      const dummyHash =
        "$argon2id$v=19$m=65536,t=3,p=4$c29tZXNhbHQ$RdescudvJCsgqlfrePlflGQ";
      await argon2.verify(dummyHash, "dummy_password_timing_defense");
    } catch {
      // Ignore
    }
  }

  /**
   * Standard cookie options for HTTP-only session cookie
   */
  public getCookieOptions() {
    return {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax" as const,
      path: "/",
      maxAge: this.SESSION_TTL_MS,
    };
  }
}
