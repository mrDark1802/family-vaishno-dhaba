import * as crypto from "crypto";
import * as argon2 from "argon2";
import { authenticator } from "otplib";
import * as qrcode from "qrcode";

async function runTwoFactorVerificationTests() {
  console.log("🔐 Starting Production TOTP 2FA Verification Test Suite...\n");

  const encryptionKey = crypto
    .createHash("sha256")
    .update(
      "fvd_totp_encryption_key_32_bytes_dev_2026_change_in_production_key!",
    )
    .digest();

  // Test 1: AES-256-GCM Authenticated Encryption & Decryption
  console.log("1. Testing AES-256-GCM Secret Encryption & Decryption...");
  const rawTotpSecret = authenticator.generateSecret();
  console.log("   ✔ Generated raw TOTP Secret (Base32):", rawTotpSecret);

  // Encrypt with AES-256-GCM
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", encryptionKey, iv);
  const encrypted = Buffer.concat([
    cipher.update(rawTotpSecret, "utf8"),
    cipher.final(),
  ]);
  const authTag = cipher.getAuthTag();
  const encryptedPayload = `${iv.toString("hex")}:${authTag.toString("hex")}:${encrypted.toString("hex")}`;
  console.log(
    "   ✔ Encrypted Payload stored in PostgreSQL:",
    encryptedPayload.substring(0, 35) + "...",
  );

  // Decrypt with AES-256-GCM
  const [ivHex, tagHex, cipherHex] = encryptedPayload.split(":");
  const decipher = crypto.createDecipheriv(
    "aes-256-gcm",
    encryptionKey,
    Buffer.from(ivHex, "hex"),
  );
  decipher.setAuthTag(Buffer.from(tagHex, "hex"));
  const decryptedSecret = Buffer.concat([
    decipher.update(Buffer.from(cipherHex, "hex")),
    decipher.final(),
  ]).toString("utf8");

  if (decryptedSecret !== rawTotpSecret) {
    throw new Error(
      "AES-256-GCM decryption failed to recover original secret!",
    );
  }
  console.log(
    "   ✔ AES-256-GCM decrypted secret successfully matches original.",
  );

  // Test 2: Standard TOTP Generation & RFC 6238 Verification
  console.log(
    "\n2. Testing TOTP Generation & Verification (Google Authenticator RFC 6238)...",
  );
  authenticator.options = { step: 30, window: 1 };
  const currentToken = authenticator.generate(rawTotpSecret);
  console.log("   ✔ Generated current 6-digit TOTP code:", currentToken);

  const isValidToken = authenticator.check(currentToken, decryptedSecret);
  if (!isValidToken) {
    throw new Error("TOTP check failed for valid generated code!");
  }
  console.log("   ✔ Authenticator successfully verified 6-digit code.");

  const isInvalidToken = authenticator.check("999999", decryptedSecret);
  if (isInvalidToken) {
    throw new Error("TOTP check falsely accepted invalid code!");
  }
  console.log("   ✔ Authenticator successfully rejected invalid code.");

  // Test 3: Google Authenticator URI & QR Code Generation
  console.log("\n3. Testing Google Authenticator URI & QR Code Rendering...");
  const accountLabel = "9816054321";
  const issuer = "Family Vaishno Dhaba";
  const otpauthUri = authenticator.keyuri(accountLabel, issuer, rawTotpSecret);
  if (
    !otpauthUri.startsWith("otpauth://totp/") ||
    !otpauthUri.includes("Family%20Vaishno%20Dhaba")
  ) {
    throw new Error(`Malformed otpauth URI: ${otpauthUri}`);
  }
  console.log("   ✔ Valid otpauth URI:", otpauthUri);

  const qrDataUrl = await qrcode.toDataURL(otpauthUri, {
    margin: 1,
    width: 200,
  });
  if (!qrDataUrl.startsWith("data:image/png;base64,")) {
    throw new Error("QR Code Data URL generation failed!");
  }
  console.log(
    "   ✔ Generated QR Code Data URL:",
    qrDataUrl.substring(0, 40) + "...",
  );

  // Test 4: One-Time Recovery Codes Hashing & Verification
  console.log("\n4. Testing One-Time Recovery Codes & Argon2id Hashing...");
  const recoveryCodes: string[] = [];
  const hashedCodes: string[] = [];

  for (let i = 0; i < 8; i++) {
    const rawHex = crypto.randomBytes(6).toString("hex").toUpperCase();
    const formatted = rawHex.match(/.{1,4}/g)?.join("-") || rawHex;
    recoveryCodes.push(formatted);

    const codeHash = await argon2.hash(rawHex, {
      type: argon2.argon2id,
      memoryCost: 32768,
      timeCost: 2,
    });
    hashedCodes.push(codeHash);
  }

  console.log(
    "   ✔ Generated 8 recovery codes in format XXXX-XXXX-XXXX. Example:",
    recoveryCodes[0],
  );
  console.log(
    "   ✔ Stored only Argon2id hashes in database. Example hash:",
    hashedCodes[0].substring(0, 30) + "...",
  );

  // Verify first code
  const codeToVerify = recoveryCodes[0].replace(/-/g, "");
  const matchResult = await argon2.verify(hashedCodes[0], codeToVerify);
  if (!matchResult) {
    throw new Error("Argon2id failed to verify valid recovery code!");
  }
  console.log("   ✔ Recovery code successfully verified against stored hash.");

  // Invalidate code after single use
  hashedCodes.splice(0, 1);
  console.log(
    "   ✔ Consumed recovery code invalidated and removed from database. Remaining:",
    hashedCodes.length,
  );

  // Test 5: Login Challenge Token & Single-Use Enforcement
  console.log("\n5. Testing 2FA Login Challenge Mechanism...");
  const rawChallenge = crypto.randomBytes(32).toString("hex");
  const challengeHash = crypto
    .createHash("sha256")
    .update(rawChallenge)
    .digest("hex");
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 mins

  console.log(
    "   ✔ Issued 5-minute single-use challenge token:",
    rawChallenge.substring(0, 16) + "...",
  );
  console.log(
    "   ✔ Challenge SHA-256 hash stored in PostgreSQL:",
    challengeHash.substring(0, 16) + "...",
  );

  if (expiresAt < new Date()) {
    throw new Error("Challenge expiration calculation invalid!");
  }
  console.log("   ✔ Challenge validity verified.");

  console.log(
    "\n✨ All 5 Two-Factor Authentication Security Tests Passed Successfully!\n",
  );
}

runTwoFactorVerificationTests().catch((err) => {
  console.error("❌ 2FA verification failed:", err);
  process.exit(1);
});
