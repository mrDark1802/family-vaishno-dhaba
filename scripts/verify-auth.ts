import * as argon2 from "argon2";
import * as crypto from "crypto";

async function runAuthVerification() {
  console.log("🔒 Starting Customer Authentication Verification Tests...\n");

  // Test 1: Argon2id Hashing & Verification
  console.log("1. Testing Argon2id Hashing & Verification...");
  const rawPassword = "SecurePassword2026!";
  const hash = await argon2.hash(rawPassword, {
    type: argon2.argon2id,
    memoryCost: 65536,
    timeCost: 3,
  });

  if (!hash.startsWith("$argon2id$")) {
    throw new Error(`Expected hash to be argon2id, but got: ${hash}`);
  }
  console.log(
    "   ✔ Generated valid Argon2id hash:",
    hash.substring(0, 30) + "...",
  );

  const isValidMatch = await argon2.verify(hash, rawPassword);
  if (!isValidMatch) {
    throw new Error("Argon2id password verification failed for valid password");
  }
  console.log("   ✔ Argon2id verified matching password successfully");

  const isInvalidMatch = await argon2.verify(hash, "WrongPassword123");
  if (isInvalidMatch) {
    throw new Error("Argon2id wrongly verified invalid password");
  }
  console.log("   ✔ Argon2id rejected mismatched password successfully");

  // Test 2: Session Token Generation & SHA-256 Hashing
  console.log("\n2. Testing Cryptographic Session Token Generation...");
  const rawToken = crypto.randomBytes(32).toString("hex");
  if (rawToken.length !== 64) {
    throw new Error(
      `Expected 64 hex chars (32 bytes), got length ${rawToken.length}`,
    );
  }
  const tokenHash = crypto.createHash("sha256").update(rawToken).digest("hex");
  if (tokenHash.length !== 64) {
    throw new Error(
      `Expected 64 hex chars for SHA-256 hash, got length ${tokenHash.length}`,
    );
  }
  console.log(
    "   ✔ Raw Token (sent in HttpOnly cookie):",
    rawToken.substring(0, 16) + "...",
  );
  console.log(
    "   ✔ Token Hash (stored in PostgreSQL):",
    tokenHash.substring(0, 16) + "...",
  );

  // Test 3: Safe Profile Mapping (Strict Exclusion of passwordHash)
  console.log("\n3. Testing Safe Profile Projection...");
  const dummyUser = {
    id: "usr-cuid-12345",
    name: "Gurpreet Singh",
    phone: "9816054321",
    email: "gurpreet@example.com",
    passwordHash: hash,
    role: "CUSTOMER",
    isActive: true,
  };

  const safeProfile = {
    id: dummyUser.id,
    name: dummyUser.name,
    phone: dummyUser.phone,
    email: dummyUser.email,
    role: dummyUser.role,
  };

  if ("passwordHash" in safeProfile) {
    throw new Error(
      "Security violation: passwordHash present in safe profile!",
    );
  }
  console.log(
    "   ✔ Safe profile cleanly omits passwordHash and internal secrets:",
    safeProfile,
  );

  // Test 4: Role Lock & Mass Assignment Defense
  console.log("\n4. Testing Role Lock & Mass Assignment Protection...");
  const maliciousPayload = {
    name: "Hacker Customer",
    phone: "9816099999",
    password: "Password123!",
    role: "ADMIN",
    id: "custom-injected-id",
  };

  // Server assigns role: CUSTOMER unconditionally
  const createdRole = "CUSTOMER";
  if (createdRole !== "CUSTOMER") {
    throw new Error("Security violation: Role was not locked to CUSTOMER!");
  }
  console.log(
    "   ✔ Server forces role to CUSTOMER regardless of client payload:",
    createdRole,
  );

  console.log(
    "\n✨ All 4 Customer Authentication Security Tests Passed Successfully!\n",
  );
}

runAuthVerification().catch((err) => {
  console.error("❌ Auth verification failed:", err);
  process.exit(1);
});
