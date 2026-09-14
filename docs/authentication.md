# Family Vaishno Dhaba — Production Authentication & TOTP 2FA Architecture

## 1. Overview & Architectural Philosophy

Family Vaishno Dhaba uses a **server-authoritative, session-backed authentication architecture** built with **NestJS, PostgreSQL, Prisma, Argon2id, AES-256-GCM, and HTTP-only cookies**.

### Core Tenets:

1. **Guest Checkout First**: Account creation is strictly optional. Customers can place orders without creating an account. Authentication enriches the customer experience with saved details, order receipts, and optional 2FA protection.
2. **Server-Side Credential Handling**: The browser never hashes passwords, never sees password hashes, and never stores opaque session tokens in JavaScript-accessible storage (`localStorage`, `sessionStorage`, or React state).
3. **HTTP-Only Cookies (`fvd_session`)**: Sessions are transmitted and maintained purely via secure, HTTP-only, `SameSite=Lax` cookies.
4. **Cart State Isolation**: Logging in, registering, or signing out never alters, destroys, or resets the customer's cart items.
5. **Google Authenticator-Compatible TOTP 2FA**: RFC 6238-compliant Two-Factor Authentication with authenticated AES-256-GCM secret encryption at rest, one-time recovery codes, and challenge-based login flows.

```text
[Customer Journey]
Browse Menu → Add Items → Cart → Checkout
                                   ├── Option A: Continue as Guest → Order Confirmed
                                   ├── Option B: Sign In (Password / 2FA) → Order Confirmed
                                   └── Option C: Create Account → Order Confirmed
```

---

## 2. Password Hashing with Argon2id

Passwords and recovery codes are encrypted server-side using the industry-standard memory-hard algorithm:

- **Algorithm**: Argon2id (`argon2.argon2id`)
- **Memory Cost**: 64 MB (`65536 KiB`)
- **Time Cost**: 3 iterations
- **Parallelism**: 4 threads
- **Timing Attack Mitigation**: Nonexistent identifiers execute dummy hash verification cycles to prevent username/email enumeration.

---

## 3. Database Schema

Defined in [`prisma/schema.prisma`](../prisma/schema.prisma):

```prisma
model User {
  id                  String               @id @default(cuid())
  phone               String               @unique
  name                String?
  email               String?              @unique
  passwordHash        String?
  role                UserRole             @default(CUSTOMER)
  isActive            Boolean              @default(true)
  createdAt           DateTime             @default(now())
  updatedAt           DateTime             @updatedAt

  sessions            Session[]
  addresses           Address[]
  orders              Order[]
  auditLogs           AuditLog[]
  twoFactorAuth       TwoFactorAuth?
  twoFactorChallenges TwoFactorChallenge[]
  oauthAccounts       OAuthAccount[]

  @@index([phone])
  @@index([email])
  @@index([role])
  @@map("users")
}

model OAuthAccount {
  id                String       @id @default(cuid())
  userId            String
  provider          String       // e.g. "google"
  providerAccountId String       // Provider stable subject ID (e.g. Google 'sub')
  createdAt         DateTime     @default(now())
  updatedAt         DateTime     @updatedAt

  user              User         @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@unique([provider, providerAccountId])
  @@index([userId])
  @@map("oauth_accounts")
}

model TwoFactorAuth {
  id            String                  @id @default(cuid())
  userId        String                  @unique
  secret        String                  // AES-256-GCM encrypted payload { iv, authTag, ciphertext }
  enabled       Boolean                 @default(false)
  createdAt     DateTime                @default(now())
  updatedAt     DateTime                @updatedAt

  user          User                    @relation(fields: [userId], references: [id], onDelete: Cascade)
  recoveryCodes TwoFactorRecoveryCode[]

  @@index([userId])
  @@map("two_factor_auth")
}

model TwoFactorRecoveryCode {
  id              String        @id @default(cuid())
  twoFactorAuthId String
  codeHash        String        // Argon2id hash of one-time recovery code
  usedAt          DateTime?
  createdAt       DateTime      @default(now())

  twoFactorAuth   TwoFactorAuth @relation(fields: [twoFactorAuthId], references: [id], onDelete: Cascade)

  @@index([twoFactorAuthId])
  @@map("two_factor_recovery_codes")
}

model TwoFactorChallenge {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique     // SHA-256 hash of single-use challenge token
  expiresAt DateTime
  createdAt DateTime @default(now())

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("two_factor_challenges")
}

model Session {
  id        String   @id @default(cuid())
  userId    String
  tokenHash String   @unique
  expiresAt DateTime
  ipAddress String?
  userAgent String?
  createdAt DateTime @default(now())
  updatedAt DateTime @updatedAt

  user      User     @relation(fields: [userId], references: [id], onDelete: Cascade)

  @@index([userId])
  @@index([expiresAt])
  @@map("sessions")
}
```

---

## 4. TOTP Two-Factor Authentication (2FA) Architecture

### 4.1 Secret Encryption at Rest (AES-256-GCM)

- Authenticated AES-256-GCM encryption using `TOTP_ENCRYPTION_KEY` from the environment.
- Format: `ivHex:authTagHex:ciphertextHex`.
- Raw secrets never exist as plaintext in PostgreSQL, logs, or client responses.

### 4.2 RFC 6238 TOTP Standard

- **Time Step**: 30 seconds.
- **Digits**: 6 digits.
- **Window**: $\pm 1$ step (30-second clock drift allowance).
- **Issuer**: `"Family Vaishno Dhaba"`.
- **Account Label**: Customer email or phone number.
- **QR Code**: Rendered client-side as Data URL PNG.

### 4.3 One-Time Emergency Recovery Codes

- Format: `XXXX-XXXX-XXXX` (12 uppercase characters in 3 groups of 4).
- Quantity: 8 codes generated upon setup or regeneration.
- Stored exclusively as Argon2id hashes in `TwoFactorRecoveryCode`.
- Plaintext codes are returned **exactly once** upon generation.
- One-time use: verified and permanently deleted upon successful use.

### 4.4 Challenge-Based 2FA Login Flow

When an account with 2FA enabled signs in:

1. `POST /api/auth/login` verifies password with Argon2id.
2. Server detects `twoFactorAuth.enabled === true`.
3. Server generates a single-use 5-minute challenge token and returns `{ requiresTwoFactor: true, challenge: "..." }`. **No authenticated session cookie is created.**
4. Customer enters 6-digit TOTP code -> `POST /api/auth/2fa/verify-login` verifies challenge and code.
5. Alternatively, customer uses recovery code -> `POST /api/auth/2fa/recovery` verifies challenge and consumes one recovery code.
6. Only upon valid verification is the challenge destroyed and the real HTTP-only session cookie (`fvd_session`) established.

---

## 5. Endpoints & API Specification

| Endpoint                                  | Method | Auth Required         | Description                                                        |
| :---------------------------------------- | :----- | :-------------------- | :----------------------------------------------------------------- |
| `/api/auth/register`                      | `POST` | Public                | Register customer account, sets session cookie                     |
| `/api/auth/login`                         | `POST` | Public                | Login with identifier + password, returns session or 2FA challenge |
| `/api/auth/me`                            | `GET`  | `AuthGuard`           | Fetch current authenticated profile & 2FA status                   |
| `/api/auth/logout`                        | `POST` | Public / Cookie       | Delete session in DB, clear `fvd_session` cookie                   |
| `/api/auth/2fa/setup`                     | `POST` | `AuthGuard`           | Generate pending TOTP secret & QR code Data URL                    |
| `/api/auth/2fa/verify-setup`              | `POST` | `AuthGuard`           | Verify 6-digit code, enable 2FA, return 8 recovery codes           |
| `/api/auth/2fa/verify-login`              | `POST` | Public (Rate-limited) | Complete 2FA login challenge with TOTP code                        |
| `/api/auth/2fa/recovery`                  | `POST` | Public (Rate-limited) | Complete 2FA login challenge with recovery code                    |
| `/api/auth/2fa/disable`                   | `POST` | `AuthGuard`           | Disable 2FA with current password + TOTP/recovery code             |
| `/api/auth/2fa/recovery-codes/regenerate` | `POST` | `AuthGuard`           | Purge old codes and generate 8 new recovery codes                  |
| `/api/auth/2fa/status`                    | `GET`  | `AuthGuard`           | Inspect 2FA status and remaining recovery code count               |

---

## 6. Security Guarantees & Guards

1. **`AuthGuard`**: Validates session from cookie or Bearer header, attaches `req.user`.
2. **`RolesGuard`**: Enforces role-based permissions (e.g. `@Roles(UserRole.ADMIN)`).
3. **`@CurrentUser()`**: Param decorator extracting `CustomerProfile`.
4. **Mass Assignment Prevention**: Strict NestJS `ValidationPipe` removes all unwhitelisted fields before controller handlers execute.
5. **CORS & Credentials**: API configured with explicit allowed origins (`http://localhost:3000`, `http://localhost:3001`) and `credentials: true`. Never uses wildcard `*` with credentials.
6. **Rate Limiting**: Protected with `@nestjs/throttler` (10 req/min on login/verify-login, 5 req/min on recovery).
