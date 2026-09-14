import {
  Injectable,
  UnauthorizedException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { PrismaService } from "../../database/prisma.service";
import { authenticator } from "otplib";
import * as qrcode from "qrcode";
import * as crypto from "crypto";
import * as argon2 from "argon2";
import {
  TwoFactorSetupResponse,
  TwoFactorStatusResponse,
  UserRole,
} from "@repo/types";

// Configure otplib for standard 30s step and small window tolerance
authenticator.options = {
  step: 30,
  window: 1, // +/- 1 step (30s drift)
};

@Injectable()
export class TwoFactorService {
  private readonly logger = new Logger(TwoFactorService.name);
  private readonly ISSUER = "Family Vaishno Dhaba";
  private readonly CHALLENGE_TTL_MS = 5 * 60 * 1000; // 5 minutes
  private readonly encryptionKeyBuffer: Buffer;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    const rawKey = this.config.get<string>(
      "totp.encryptionKey",
      "fvd_totp_encryption_key_32_bytes_dev_2026_change_in_production_key!",
    );
    // Derive a fixed 32-byte key buffer using SHA-256
    this.encryptionKeyBuffer = crypto
      .createHash("sha256")
      .update(rawKey)
      .digest();
  }

  /**
   * Initiate TOTP setup: generates secret, stores pending encrypted secret, returns QR code Data URL
   */
  async generateSetup(userId: string): Promise<TwoFactorSetupResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException("User not found.");
    }

    const secret = authenticator.generateSecret();
    const accountLabel =
      user.email || user.phone || `Customer-${user.id.slice(-4)}`;
    const otpauthUrl = authenticator.keyuri(accountLabel, this.ISSUER, secret);

    const qrCodeDataUrl = await qrcode.toDataURL(otpauthUrl, {
      margin: 1,
      width: 240,
      color: {
        dark: "#1c1917", // Stone-900
        light: "#ffffff",
      },
    });

    // Encrypt secret with AES-256-GCM
    const encryptedSecret = this.encryptSecret(secret);

    // Store pending 2FA record (enabled: false)
    await this.prisma.twoFactorAuth.upsert({
      where: { userId },
      create: {
        userId,
        secret: encryptedSecret,
        enabled: false,
      },
      update: {
        secret: encryptedSecret,
        enabled: false,
      },
    });

    this.logger.log(`2FA setup initiated for user: [ID: ${userId}]`);

    return {
      qrCodeDataUrl,
      manualKey: secret,
      issuer: this.ISSUER,
      accountLabel,
    };
  }

  /**
   * Verify initial setup code and enable 2FA, returning 8 one-time recovery codes
   */
  async verifySetup(
    userId: string,
    code: string,
  ): Promise<{ success: boolean; recoveryCodes: string[]; message: string }> {
    const twoFactor = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
    });

    if (!twoFactor) {
      throw new BadRequestException(
        "No 2FA setup found. Please initiate setup first.",
      );
    }

    const secret = this.decryptSecret(twoFactor.secret);
    const isValid = authenticator.check(code, secret);

    if (!isValid) {
      throw new BadRequestException(
        "Invalid 6-digit authentication code. Please try again.",
      );
    }

    // Mark 2FA as enabled
    await this.prisma.twoFactorAuth.update({
      where: { userId },
      data: { enabled: true },
    });

    // Generate, hash, and store 8 recovery codes
    const recoveryCodes = await this.generateAndStoreRecoveryCodes(
      twoFactor.id,
    );

    this.logger.log(
      `2FA successfully verified and enabled for user: [ID: ${userId}]`,
    );

    return {
      success: true,
      recoveryCodes,
      message:
        "Two-Factor Authentication enabled successfully. Please store your recovery codes safely.",
    };
  }

  /**
   * Create a single-use 5-minute login challenge for 2FA verification
   */
  async createLoginChallenge(userId: string): Promise<string> {
    const rawChallengeToken = crypto.randomBytes(32).toString("hex");
    const tokenHash = crypto
      .createHash("sha256")
      .update(rawChallengeToken)
      .digest("hex");

    const expiresAt = new Date(Date.now() + this.CHALLENGE_TTL_MS);

    // Clean up any existing challenges for this user
    await this.prisma.twoFactorChallenge.deleteMany({
      where: { userId },
    });

    await this.prisma.twoFactorChallenge.create({
      data: {
        userId,
        tokenHash,
        expiresAt,
      },
    });

    return rawChallengeToken;
  }

  /**
   * Verify TOTP code against login challenge and consume challenge
   */
  async verifyLogin(
    challengeToken: string,
    code: string,
  ): Promise<{ userId: string }> {
    const tokenHash = crypto
      .createHash("sha256")
      .update(challengeToken)
      .digest("hex");

    const challenge = await this.prisma.twoFactorChallenge.findUnique({
      where: { tokenHash },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      throw new UnauthorizedException(
        "Authentication challenge expired or invalid. Please sign in again.",
      );
    }

    const twoFactor = await this.prisma.twoFactorAuth.findUnique({
      where: { userId: challenge.userId },
    });

    if (!twoFactor || !twoFactor.enabled) {
      throw new UnauthorizedException(
        "Two-factor authentication is not active for this account.",
      );
    }

    const secret = this.decryptSecret(twoFactor.secret);
    const isValid = authenticator.check(code, secret);

    if (!isValid) {
      throw new UnauthorizedException("Invalid 6-digit authentication code.");
    }

    // Invalidate challenge immediately (single use)
    await this.prisma.twoFactorChallenge.delete({
      where: { id: challenge.id },
    });

    this.logger.log(`2FA login successful for user: [ID: ${challenge.userId}]`);

    return { userId: challenge.userId };
  }

  /**
   * Verify recovery code against login challenge and consume challenge + recovery code
   */
  async verifyRecoveryLogin(
    challengeToken: string,
    rawRecoveryCode: string,
  ): Promise<{ userId: string }> {
    const tokenHash = crypto
      .createHash("sha256")
      .update(challengeToken)
      .digest("hex");

    const challenge = await this.prisma.twoFactorChallenge.findUnique({
      where: { tokenHash },
    });

    if (!challenge || challenge.expiresAt < new Date()) {
      throw new UnauthorizedException(
        "Authentication challenge expired or invalid. Please sign in again.",
      );
    }

    const twoFactor = await this.prisma.twoFactorAuth.findUnique({
      where: { userId: challenge.userId },
      include: { recoveryCodes: { where: { usedAt: null } } },
    });

    if (!twoFactor || !twoFactor.enabled) {
      throw new UnauthorizedException(
        "Two-factor authentication is not active for this account.",
      );
    }

    const normalizedInputCode = rawRecoveryCode
      .trim()
      .toUpperCase()
      .replace(/[\s-]/g, "");

    let matchedCodeId: string | null = null;
    for (const rc of twoFactor.recoveryCodes) {
      const match = await argon2.verify(rc.codeHash, normalizedInputCode);
      if (match) {
        matchedCodeId = rc.id;
        break;
      }
    }

    if (!matchedCodeId) {
      throw new UnauthorizedException(
        "Invalid or previously used recovery code.",
      );
    }

    // Invalidate the used recovery code permanently
    await this.prisma.twoFactorRecoveryCode.delete({
      where: { id: matchedCodeId },
    });

    // Invalidate challenge immediately (single use)
    await this.prisma.twoFactorChallenge.delete({
      where: { id: challenge.id },
    });

    this.logger.log(
      `Recovery-code login successful for user: [ID: ${challenge.userId}], remaining codes: ${twoFactor.recoveryCodes.length - 1}`,
    );

    return { userId: challenge.userId };
  }

  /**
   * Disable 2FA after validating password and current TOTP or recovery code
   */
  async disable(
    userId: string,
    password: string,
    code: string,
  ): Promise<{ success: boolean; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        twoFactorAuth: {
          include: { recoveryCodes: { where: { usedAt: null } } },
        },
      },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("User not found.");
    }

    // Verify current password
    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Incorrect password.");
    }

    if (!user.twoFactorAuth || !user.twoFactorAuth.enabled) {
      throw new BadRequestException(
        "Two-factor authentication is not enabled.",
      );
    }

    // Verify TOTP or Recovery code
    const secret = this.decryptSecret(user.twoFactorAuth.secret);
    const isTotpValid = authenticator.check(code, secret);

    let isRecoveryCodeValid = false;
    if (!isTotpValid) {
      const normalizedCode = code.trim().toUpperCase().replace(/[\s-]/g, "");
      for (const rc of user.twoFactorAuth.recoveryCodes) {
        if (await argon2.verify(rc.codeHash, normalizedCode)) {
          isRecoveryCodeValid = true;
          break;
        }
      }
    }

    if (!isTotpValid && !isRecoveryCodeValid) {
      throw new UnauthorizedException(
        "Invalid authentication code or recovery code.",
      );
    }

    // Delete 2FA record (cascade deletes recovery codes)
    await this.prisma.twoFactorAuth.delete({
      where: { userId },
    });

    this.logger.log(`2FA disabled for user: [ID: ${userId}]`);

    return {
      success: true,
      message: "Two-Factor Authentication has been disabled.",
    };
  }

  /**
   * Regenerate 8 new recovery codes after validating password and TOTP code
   */
  async regenerateRecoveryCodes(
    userId: string,
    password: string,
    code: string,
  ): Promise<{ success: boolean; recoveryCodes: string[]; message: string }> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: { twoFactorAuth: true },
    });

    if (!user || !user.passwordHash) {
      throw new UnauthorizedException("User not found.");
    }

    // Verify password
    const isPasswordValid = await argon2.verify(user.passwordHash, password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Incorrect password.");
    }

    if (!user.twoFactorAuth || !user.twoFactorAuth.enabled) {
      throw new BadRequestException(
        "Two-factor authentication is not enabled.",
      );
    }

    // Verify TOTP
    const secret = this.decryptSecret(user.twoFactorAuth.secret);
    const isValid = authenticator.check(code, secret);
    if (!isValid) {
      throw new UnauthorizedException("Invalid 6-digit authentication code.");
    }

    // Generate and store new recovery codes
    const recoveryCodes = await this.generateAndStoreRecoveryCodes(
      user.twoFactorAuth.id,
    );

    this.logger.log(`Recovery codes regenerated for user: [ID: ${userId}]`);

    return {
      success: true,
      recoveryCodes,
      message:
        "New recovery codes generated. Previous recovery codes are now invalidated.",
    };
  }

  /**
   * Get 2FA status and count of remaining recovery codes
   */
  async getStatus(userId: string): Promise<TwoFactorStatusResponse> {
    const twoFactor = await this.prisma.twoFactorAuth.findUnique({
      where: { userId },
      include: { recoveryCodes: { where: { usedAt: null } } },
    });

    if (!twoFactor || !twoFactor.enabled) {
      return {
        enabled: false,
        remainingRecoveryCodes: 0,
      };
    }

    return {
      enabled: true,
      remainingRecoveryCodes: twoFactor.recoveryCodes.length,
    };
  }

  /**
   * Helper: Generate 8 formatted recovery codes and store their Argon2id hashes
   */
  private async generateAndStoreRecoveryCodes(
    twoFactorAuthId: string,
  ): Promise<string[]> {
    // Delete existing recovery codes
    await this.prisma.twoFactorRecoveryCode.deleteMany({
      where: { twoFactorAuthId },
    });

    const plainCodes: string[] = [];
    const createData: { twoFactorAuthId: string; codeHash: string }[] = [];

    for (let i = 0; i < 8; i++) {
      // 12 uppercase characters in 3 groups of 4: e.g. FVD1-A89C-K92X
      const rawHex = crypto.randomBytes(6).toString("hex").toUpperCase();
      const formatted = rawHex.match(/.{1,4}/g)?.join("-") || rawHex;
      plainCodes.push(formatted);

      // Hash normalized code (without hyphens) with Argon2id
      const normalized = rawHex;
      const codeHash = await argon2.hash(normalized, {
        type: argon2.argon2id,
        memoryCost: 32768,
        timeCost: 2,
      });

      createData.push({
        twoFactorAuthId,
        codeHash,
      });
    }

    await this.prisma.twoFactorRecoveryCode.createMany({
      data: createData,
    });

    return plainCodes;
  }

  /**
   * Helper: AES-256-GCM authenticated encryption
   */
  private encryptSecret(plainText: string): string {
    const iv = crypto.randomBytes(12); // 12-byte standard GCM IV
    const cipher = crypto.createCipheriv(
      "aes-256-gcm",
      this.encryptionKeyBuffer,
      iv,
    );

    const encrypted = Buffer.concat([
      cipher.update(plainText, "utf8"),
      cipher.final(),
    ]);

    const authTag = cipher.getAuthTag();

    // Format: iv:authTag:ciphertext (all in hex)
    return `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  }

  /**
   * Helper: AES-256-GCM authenticated decryption
   */
  private decryptSecret(encryptedPayload: string): string {
    const parts = encryptedPayload.split(":");
    if (parts.length !== 3) {
      throw new Error(
        "Corrupted or invalid encrypted TOTP secret payload format.",
      );
    }

    const [ivHex, tagHex, cipherHex] = parts;
    const iv = Buffer.from(ivHex, "hex");
    const authTag = Buffer.from(tagHex, "hex");
    const encrypted = Buffer.from(cipherHex, "hex");

    const decipher = crypto.createDecipheriv(
      "aes-256-gcm",
      this.encryptionKeyBuffer,
      iv,
    );

    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([
      decipher.update(encrypted),
      decipher.final(),
    ]);

    return decrypted.toString("utf8");
  }
}
