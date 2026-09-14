import {
  Injectable,
  BadRequestException,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "@prisma/client";
import * as crypto from "crypto";
import { OtpSendResponse, OtpVerifyResponse } from "../../types";

@Injectable()
export class VerificationService {
  private readonly logger = new Logger(VerificationService.name);
  private readonly secretKey: string;
  private readonly OTP_TTL_MS = 5 * 60 * 1000; // 5 minutes for OTP entry
  private readonly TOKEN_TTL_MS = 30 * 60 * 1000; // 30 minutes for order placement
  private readonly RESEND_COOLDOWN_MS = 60 * 1000; // 60 seconds cooldown
  private readonly MAX_ATTEMPTS = 3;

  constructor(
    private readonly prisma: PrismaService,
    private readonly configService: ConfigService,
  ) {
    this.secretKey = this.configService.get<string>(
      "jwt.secret",
      "fvd_default_dev_verification_secret_2026",
    );
  }

  /**
   * Normalize 10-digit Indian mobile number
   */
  public normalizePhone(phone: string): string {
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
   * Hash 6-digit OTP with HMAC-SHA256
   */
  private hashOtp(phone: string, otp: string): string {
    return crypto
      .createHmac("sha256", this.secretKey)
      .update(`${phone}:${otp}`)
      .digest("hex");
  }

  /**
   * Hash verification token with SHA-256
   */
  private hashToken(token: string): string {
    return crypto.createHash("sha256").update(token).digest("hex");
  }

  /**
   * Send 6-digit OTP code to customer mobile number.
   */
  async sendOtp(phoneInput: string): Promise<OtpSendResponse> {
    const phone = this.normalizePhone(phoneInput);
    const now = new Date();

    // 1. Check for active recent verification to enforce 60s cooldown
    const latest = await this.prisma.phoneVerification.findFirst({
      where: { phone },
      orderBy: { createdAt: "desc" },
    });

    if (latest && now.getTime() - latest.createdAt.getTime() < this.RESEND_COOLDOWN_MS) {
      const waitSeconds = Math.ceil(
        (this.RESEND_COOLDOWN_MS - (now.getTime() - latest.createdAt.getTime())) / 1000,
      );
      throw new HttpException(
        `Please wait ${waitSeconds} seconds before requesting a new verification code.`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 2. Check hourly limit (max 5 OTPs per hour per phone to prevent abuse)
    const oneHourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    const countLastHour = await this.prisma.phoneVerification.count({
      where: {
        phone,
        createdAt: { gte: oneHourAgo },
      },
    });

    if (countLastHour >= 5) {
      throw new HttpException(
        "Maximum verification attempts reached for this hour. Please try again later.",
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    // 3. Generate random 6-digit numeric OTP
    const otp = crypto.randomInt(100000, 999999).toString();
    const otpHash = this.hashOtp(phone, otp);
    const expiresAt = new Date(now.getTime() + this.OTP_TTL_MS);

    // 4. Save verification record in PostgreSQL
    await this.prisma.phoneVerification.create({
      data: {
        phone,
        otpHash,
        attempts: 0,
        expiresAt,
      },
    });

    const isDev = process.env.NODE_ENV !== "production";
    this.logger.log(
      `[SMS DISPATCH] Verification OTP for +91 ${phone}: [${otp}] (Expires in 5m)`,
    );

    return {
      success: true,
      message: `Verification code sent to +91 ${phone}`,
      expiresInSeconds: this.OTP_TTL_MS / 1000,
      resendCooldownSeconds: this.RESEND_COOLDOWN_MS / 1000,
      debugOtp: isDev ? otp : undefined,
    };
  }

  /**
   * Verify 6-digit OTP code and issue a cryptographically signed verification token.
   */
  async verifyOtp(phoneInput: string, otpInput: string): Promise<OtpVerifyResponse> {
    const phone = this.normalizePhone(phoneInput);
    const otp = otpInput.trim();
    const now = new Date();

    // 1. Find latest unconsumed verification for this phone
    const record = await this.prisma.phoneVerification.findFirst({
      where: {
        phone,
        consumedAt: null,
      },
      orderBy: { createdAt: "desc" },
    });

    if (!record) {
      throw new BadRequestException(
        "No active verification request found. Please request a new code.",
      );
    }

    // 2. Check expiration
    if (record.expiresAt < now) {
      throw new BadRequestException(
        "Verification code has expired. Please request a new code.",
      );
    }

    // 3. Check brute force attempts
    if (record.attempts >= this.MAX_ATTEMPTS) {
      throw new BadRequestException(
        "Too many incorrect attempts. This code is invalidated. Please request a new code.",
      );
    }

    // 4. Verify OTP hash
    const expectedOtpHash = this.hashOtp(phone, otp);
    const isMatch = crypto.timingSafeEqual(
      Buffer.from(record.otpHash, "hex"),
      Buffer.from(expectedOtpHash, "hex"),
    );

    if (!isMatch) {
      // Increment failed attempts
      const updatedAttempts = record.attempts + 1;
      await this.prisma.phoneVerification.update({
        where: { id: record.id },
        data: { attempts: updatedAttempts },
      });

      const remaining = this.MAX_ATTEMPTS - updatedAttempts;
      if (remaining <= 0) {
        throw new BadRequestException(
          "Invalid verification code. Maximum attempts reached. Please request a new code.",
        );
      }

      throw new BadRequestException(
        `Invalid verification code. ${remaining} attempt${remaining > 1 ? "s" : ""} remaining.`,
      );
    }

    // 5. Successful match: Issue single-use opaque verification token (30-min TTL)
    const rawToken = `pvt_${crypto.randomBytes(24).toString("hex")}`;
    const tokenHash = this.hashToken(rawToken);
    const tokenExpiresAt = new Date(now.getTime() + this.TOKEN_TTL_MS);

    await this.prisma.phoneVerification.update({
      where: { id: record.id },
      data: {
        verifiedAt: now,
        tokenHash,
        expiresAt: tokenExpiresAt,
      },
    });

    this.logger.log(`Mobile number +91 ${phone} successfully verified!`);

    return {
      success: true,
      verified: true,
      phone,
      verificationToken: rawToken,
      message: "Mobile number verified successfully.",
    };
  }

  /**
   * Validate and consume the verification token inside an order transaction.
   */
  async validateAndConsumeToken(
    phoneInput: string,
    rawToken?: string,
    tx?: Prisma.TransactionClient,
  ): Promise<void> {
    if (!rawToken || !rawToken.trim()) {
      throw new BadRequestException(
        "Mobile verification token is required. Please verify your phone number.",
      );
    }
    const prismaClient = tx || this.prisma;
    const phone = this.normalizePhone(phoneInput);
    const tokenHash = this.hashToken(rawToken.trim());
    const now = new Date();

    const record = await prismaClient.phoneVerification.findUnique({
      where: { tokenHash },
    });

    if (!record) {
      throw new BadRequestException(
        "Invalid mobile verification token. Please verify your phone number.",
      );
    }

    if (record.phone !== phone) {
      throw new BadRequestException(
        "Mobile verification mismatch. The verified phone number does not match your order phone.",
      );
    }

    if (!record.verifiedAt) {
      throw new BadRequestException(
        "Phone number has not been verified. Please complete OTP verification.",
      );
    }

    if (record.consumedAt) {
      throw new BadRequestException(
        "This verification token has already been used. Please re-verify your phone number.",
      );
    }

    if (record.expiresAt < now) {
      throw new BadRequestException(
        "Mobile verification has expired. Please verify your phone number again.",
      );
    }

    // Atomically mark token as consumed
    await prismaClient.phoneVerification.update({
      where: { id: record.id },
      data: { consumedAt: now },
    });
  }
}
