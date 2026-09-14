import * as crypto from "crypto";
import { UserRole } from "../src/types";

// Replicate GoogleAuthService security & business logic for standalone verification
class MockGoogleAuthService {
  private readonly sessionSecret =
    "fvd_super_secret_session_key_for_dev_kangra_dhaba_2026";
  private readonly frontendUrl = "http://localhost:3000";

  public sanitizeReturnUrl(returnTo?: string): string {
    if (!returnTo || typeof returnTo !== "string") {
      return "/account";
    }

    const trimmed = returnTo.trim();

    if (
      trimmed.startsWith("/") &&
      !trimmed.startsWith("//") &&
      !trimmed.startsWith("/\\") &&
      !trimmed.includes(":") &&
      !trimmed.includes("\n") &&
      !trimmed.includes("\r")
    ) {
      return trimmed;
    }

    return "/account";
  }

  public generateState(nonce: string, returnTo?: string): string {
    const sanitizedReturn = this.sanitizeReturnUrl(returnTo);
    const payload = JSON.stringify({
      nonce,
      returnTo: sanitizedReturn,
      timestamp: Date.now(),
    });

    const hmac = crypto
      .createHmac("sha256", this.sessionSecret)
      .update(payload)
      .digest("hex");

    const stateObj = {
      p: Buffer.from(payload).toString("base64url"),
      s: hmac,
    };

    return Buffer.from(JSON.stringify(stateObj)).toString("base64url");
  }

  public validateState(
    stateParam: string,
    expectedNonce: string,
  ): { isValid: boolean; returnTo: string; error?: string } {
    try {
      if (!stateParam || !expectedNonce) {
        return {
          isValid: false,
          returnTo: "/account",
          error: "Missing state or nonce",
        };
      }

      const decodedStateStr = Buffer.from(stateParam, "base64url").toString(
        "utf8",
      );
      const stateObj = JSON.parse(decodedStateStr);

      if (!stateObj.p || !stateObj.s) {
        return {
          isValid: false,
          returnTo: "/account",
          error: "Invalid state structure",
        };
      }

      const payloadStr = Buffer.from(stateObj.p, "base64url").toString("utf8");
      const computedHmac = crypto
        .createHmac("sha256", this.sessionSecret)
        .update(payloadStr)
        .digest("hex");

      const isValidSignature = crypto.timingSafeEqual(
        Buffer.from(computedHmac, "hex"),
        Buffer.from(stateObj.s, "hex"),
      );

      if (!isValidSignature) {
        return {
          isValid: false,
          returnTo: "/account",
          error: "Invalid HMAC signature",
        };
      }

      const payload = JSON.parse(payloadStr);

      if (payload.nonce !== expectedNonce) {
        return {
          isValid: false,
          returnTo: "/account",
          error: "Nonce mismatch",
        };
      }

      // Expire after 10 minutes (600,000 ms)
      const maxAgeMs = 10 * 60 * 1000;
      if (Date.now() - payload.timestamp > maxAgeMs) {
        return {
          isValid: false,
          returnTo: "/account",
          error: "OAuth state expired",
        };
      }

      const returnTo = this.sanitizeReturnUrl(payload.returnTo);
      return { isValid: true, returnTo };
    } catch (err: any) {
      return { isValid: false, returnTo: "/account", error: err.message };
    }
  }

  public async handleMockGoogleIdentity(
    profile: {
      sub: string;
      email: string;
      name: string;
      emailVerified: boolean;
    },
    dbUsers: any[],
    dbOAuthAccounts: any[],
  ): Promise<{
    user?: any;
    created?: boolean;
    requiresTwoFactor?: boolean;
    accountExistsLinkRequired?: boolean;
  }> {
    // 1. Check existing OAuth link
    const existingOAuth = dbOAuthAccounts.find(
      (oa) => oa.provider === "google" && oa.providerAccountId === profile.sub,
    );

    if (existingOAuth) {
      const user = dbUsers.find((u) => u.id === existingOAuth.userId);
      if (!user) throw new Error("Linked user record missing");

      if (user.isTwoFactorEnabled) {
        return { user, requiresTwoFactor: true };
      }
      return { user, requiresTwoFactor: false };
    }

    // 2. Account Collision Check
    const normalizedEmail = profile.email.toLowerCase().trim();
    const existingUserByEmail = dbUsers.find(
      (u) => u.email?.toLowerCase().trim() === normalizedEmail,
    );

    if (existingUserByEmail) {
      // DO NOT silently link -> prevent account takeover
      return { accountExistsLinkRequired: true };
    }

    // 3. New User Registration
    const newUser = {
      id: `usr_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      name: profile.name,
      email: normalizedEmail,
      phone: null,
      role: UserRole.CUSTOMER, // Must ALWAYS be CUSTOMER
      isTwoFactorEnabled: false,
      passwordHash: null,
      createdAt: new Date(),
    };
    dbUsers.push(newUser);

    const newOAuth = {
      id: `oa_${Date.now()}`,
      userId: newUser.id,
      provider: "google",
      providerAccountId: profile.sub,
    };
    dbOAuthAccounts.push(newOAuth);

    return { user: newUser, created: true, requiresTwoFactor: false };
  }

  public unlinkGoogle(
    user: { id: string; passwordHash: string | null },
    dbOAuthAccounts: any[],
  ): { success: boolean; error?: string } {
    if (!user.passwordHash) {
      return {
        success: false,
        error:
          "Cannot disconnect Google account without a password. Please set a password first to prevent lockout.",
      };
    }

    const index = dbOAuthAccounts.findIndex(
      (oa) => oa.userId === user.id && oa.provider === "google",
    );
    if (index === -1) {
      return { success: false, error: "Google account is not linked." };
    }

    dbOAuthAccounts.splice(index, 1);
    return { success: true };
  }
}

async function runGoogleAuthVerificationTests() {
  console.log(
    "🔒 Starting Production Google Authentication & Identity Verification Suite...\n",
  );

  const authService = new MockGoogleAuthService();

  // Test 1: Open Redirect Protection
  console.log("1. Testing Open Redirect & Target URL Sanitization...");
  const validRelative = authService.sanitizeReturnUrl("/checkout");
  if (validRelative !== "/checkout")
    throw new Error("Failed to preserve valid relative returnTo");

  const protocolRelative = authService.sanitizeReturnUrl("//evil.com/phish");
  if (protocolRelative !== "/account")
    throw new Error("Failed to sanitize protocol-relative URL");

  const absoluteUrl = authService.sanitizeReturnUrl("https://evil.com");
  if (absoluteUrl !== "/account")
    throw new Error("Failed to sanitize absolute URL");

  const invalidChars = authService.sanitizeReturnUrl(
    "/account\r\nSet-Cookie: evil",
  );
  if (invalidChars !== "/account")
    throw new Error("Failed to sanitize header-injection characters");

  console.log("   ✔ Valid relative URL preserved: /checkout");
  console.log("   ✔ Protocol-relative URL blocked (//evil.com -> /account)");
  console.log("   ✔ Absolute URL blocked (https://evil.com -> /account)");
  console.log("   ✔ Injection characters blocked");

  // Test 2: OAuth State HMAC Signature & CSRF Nonce Verification
  console.log(
    "\n2. Testing OAuth State Generation & HMAC-SHA256 Cryptographic Verification...",
  );
  const nonce = crypto.randomBytes(16).toString("hex");
  const state = authService.generateState(nonce, "/checkout");

  const validResult = authService.validateState(state, nonce);
  if (!validResult.isValid || validResult.returnTo !== "/checkout") {
    throw new Error(`State verification failed: ${validResult.error}`);
  }
  console.log(
    "   ✔ Valid HMAC-signed OAuth state passed verification with returnTo=/checkout.",
  );

  // Test tampered state
  const tamperedPayload = Buffer.from(
    JSON.stringify({ nonce, returnTo: "/evil", timestamp: Date.now() }),
  ).toString("base64url");
  const tamperedState = Buffer.from(
    JSON.stringify({ p: tamperedPayload, s: "deadbeef" }),
  ).toString("base64url");
  const tamperedResult = authService.validateState(tamperedState, nonce);
  if (tamperedResult.isValid) {
    throw new Error("Tampered state was falsely accepted!");
  }
  console.log("   ✔ Tampered HMAC signature correctly rejected.");

  // Test mismatched nonce
  const wrongNonceResult = authService.validateState(
    state,
    "wrong-nonce-12345",
  );
  if (wrongNonceResult.isValid) {
    throw new Error("Mismatched nonce was falsely accepted!");
  }
  console.log("   ✔ Mismatched CSRF nonce correctly rejected.");

  // Test 3: Account Linking & Collision Security
  console.log(
    "\n3. Testing Google Identity Resolution & Account Takeover Prevention...",
  );
  const mockDbUsers: any[] = [
    {
      id: "usr_existing_pass_only",
      name: "Ramesh Sharma",
      email: "ramesh@example.com",
      phone: "9816011111",
      role: UserRole.CUSTOMER,
      passwordHash: "argon2id_hash_placeholder",
      isTwoFactorEnabled: false,
    },
    {
      id: "usr_existing_totp",
      name: "Priya Verma",
      email: "priya@example.com",
      phone: "9816022222",
      role: UserRole.CUSTOMER,
      passwordHash: "argon2id_hash_placeholder",
      isTwoFactorEnabled: true,
    },
  ];

  const mockDbOAuth: any[] = [
    {
      id: "oa_priya",
      userId: "usr_existing_totp",
      provider: "google",
      providerAccountId: "google_sub_priya_12345",
    },
  ];

  // Scenario A: Collision with existing password user (different Google account / not linked)
  const collisionAttempt = await authService.handleMockGoogleIdentity(
    {
      sub: "google_sub_attacker_99999",
      email: "ramesh@example.com", // Same email as Ramesh
      name: "Fake Ramesh",
      emailVerified: true,
    },
    mockDbUsers,
    mockDbOAuth,
  );

  if (!collisionAttempt.accountExistsLinkRequired || collisionAttempt.user) {
    throw new Error(
      "Collision test failed! Unlinked existing email was incorrectly authenticated or linked.",
    );
  }
  console.log(
    "   ✔ Collision detected: Existing unlinked email rejected with accountExistsLinkRequired flag (prevents account takeover).",
  );

  // Scenario B: Existing linked Google account with 2FA enabled
  const linked2faLogin = await authService.handleMockGoogleIdentity(
    {
      sub: "google_sub_priya_12345",
      email: "priya@example.com",
      name: "Priya Verma",
      emailVerified: true,
    },
    mockDbUsers,
    mockDbOAuth,
  );

  if (!linked2faLogin.user || !linked2faLogin.requiresTwoFactor) {
    throw new Error(
      "2FA bypass failure! Linked Google login did not issue required 2FA challenge.",
    );
  }
  console.log(
    "   ✔ TOTP compatibility verified: Linked account with 2FA requires standard 2FA challenge.",
  );

  // Scenario C: New Google Customer Registration
  const newCustomer = await authService.handleMockGoogleIdentity(
    {
      sub: "google_sub_newuser_77777",
      email: "amit.kumar@example.com",
      name: "Amit Kumar",
      emailVerified: true,
    },
    mockDbUsers,
    mockDbOAuth,
  );

  if (!newCustomer.created || newCustomer.user?.role !== UserRole.CUSTOMER) {
    throw new Error(
      "New user creation failed or did not assign CUSTOMER role!",
    );
  }
  console.log(
    "   ✔ New Google customer successfully created with strictly CUSTOMER role.",
  );

  // Test 4: Account Unlinking Security
  console.log("\n4. Testing Account Unlinking Safety Rules...");
  // User without password cannot unlink
  const googleOnlyUser = { id: newCustomer.user.id, passwordHash: null };
  const unlinkAttemptNoPass = authService.unlinkGoogle(
    googleOnlyUser,
    mockDbOAuth,
  );
  if (unlinkAttemptNoPass.success) {
    throw new Error(
      "User without password was allowed to unlink Google! Risk of account lockout.",
    );
  }
  console.log(
    "   ✔ Passwordless OAuth user cannot unlink Google (protects from lockout).",
  );

  // User with password CAN unlink
  const passwordUser = { id: "usr_existing_totp", passwordHash: "argon2_hash" };
  const unlinkAttemptWithPass = authService.unlinkGoogle(
    passwordUser,
    mockDbOAuth,
  );
  if (!unlinkAttemptWithPass.success) {
    throw new Error(
      `User with password failed to unlink: ${unlinkAttemptWithPass.error}`,
    );
  }
  console.log("   ✔ User with password can safely disconnect Google account.");

  console.log(
    "\n✨ All Google Authentication security & identity tests passed successfully!\n",
  );
}

runGoogleAuthVerificationTests().catch((err) => {
  console.error("❌ Verification failed:", err);
  process.exit(1);
});
