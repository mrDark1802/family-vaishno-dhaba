# Security Architecture & Policies

Security is built into the foundation of Family Vaishno Dhaba across all layers.

---

## 1. Authentication & Session Management

- **Storage**: Authentication tokens are **NEVER** stored in browser `localStorage` or `sessionStorage` (preventing XSS credential theft).
- **HTTP-Only Cookies**: Secure, SameSite-strict, HTTP-only signed cookies are used for session transport.
- **Password Hashing**: Passwords must be hashed using modern algorithms (e.g. Argon2id or strong bcrypt) with appropriate memory/time cost parameters.
- **Session Revocation**: Stored session records in PostgreSQL allow instant revocation across all user devices upon password reset or logout.

---

## 2. API & Network Security

- **Security Headers**: Powered by `helmet` to configure `Content-Security-Policy`, `X-Content-Type-Options`, `Strict-Transport-Security` (HSTS), and frame restrictions.
- **CORS Policies**: Explicit origin whitelisting configured via the `CORS_ORIGIN` environment variable.
- **Rate Limiting & Brute-Force Protection**: Managed by `@nestjs/throttler` with configurable TTL and limits per client IP.
- **Input Validation & Sanitization**: Strict `ValidationPipe` with `whitelist: true` and `forbidNonWhitelisted: true` to reject unintended or malicious payload properties.

---

## 3. Data Protection & Query Security

- **SQL Injection Prevention**: Prisma ORM executes parameterized queries for all operations, mitigating SQL injection risks.
- **Information Disclosure Prevention**: Global `AllExceptionsFilter` intercepts all unhandled errors, logs complete stack traces to server logs only, and returns a sanitised, predictable error payload to the client.
- **Audit Logging**: An `audit_logs` table tracks security-critical events (logins, role changes, order state overrides) with IP addresses and user agents.
- **Environment Secrets**: Zero hardcoded secrets. Missing required environment variables cause immediate startup failure.
