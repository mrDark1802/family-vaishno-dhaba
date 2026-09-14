# Family Vaishno Dhaba — Backend Foundation & Architecture

## 1. Executive Summary & Stack

The backend for **Family Vaishno Dhaba** is a production-grade, modular service built specifically for a single authentic restaurant serving Punjabi and Himachali pure-vegetarian cuisine.

### Core Technology Stack:

- **Runtime**: Node.js v22 (LTS)
- **Language**: TypeScript with `strict: true`
- **Framework**: NestJS (Modular Architecture, Dependency Injection)
- **Database**: PostgreSQL 16 (Relational, ACID compliant)
- **ORM / Query Engine**: Prisma ORM with structured SQL migrations
- **Validation**: `class-validator` & `class-transformer` with strict whitelisting

---

## 2. Directory & Module Architecture

```text
apps/api/
  src/
    main.ts                       # Application bootstrap, security middlewares, prefix, global pipes
    app.module.ts                 # Root NestJS module importing configuration, database, rate limiting

    config/
      configuration.ts            # Environment variables configuration loader
      env.validation.ts           # Class-validator schema checking required variables at startup

    common/
      filters/
        http-exception.filter.ts  # Global exception filter (sanitized errors, zero query/trace leaks)
      interceptors/
        logging.interceptor.ts    # Request/Response duration and status logger (no secrets/PII logged)
        transform.interceptor.ts  # Standardized API response structure
      guards/                     # (Future) JWT & Role-Based authorization guards

    database/
      prisma.module.ts            # Global Prisma database module
      prisma.service.ts           # Singleton Prisma client lifecycle management ($connect, $disconnect)

    modules/
      health/
        health.module.ts          # Health check module
        health.controller.ts      # GET /api/health endpoint
        health.service.ts         # Ping verification for application & PostgreSQL connectivity

      auth/                       # (Future Phase) Customer authentication & session management
      menu/                       # (Future Phase) Restaurant category & product catalog
      orders/                     # (Future Phase) Server-authoritative order placement & lifecycle

prisma/
  schema.prisma                   # Canonical database schema definition
  migrations/                     # Version-controlled SQL migrations
    20260904000000_init/
      migration.sql               # Initial PostgreSQL schema migration
```

---

## 3. Environment Configuration & Startup Validation

Environment variables are validated at startup using `class-validator`. The server crashes immediately with an explicit error message if required keys (such as `DATABASE_URL` or `JWT_SECRET`) are missing.

### Environment Variable Contract:

| Variable         | Type   | Default / Example                             | Purpose                                                |
| :--------------- | :----- | :-------------------------------------------- | :----------------------------------------------------- |
| `NODE_ENV`       | Enum   | `development`                                 | Environment mode (`development`, `production`, `test`) |
| `API_PORT`       | Number | `4000`                                        | Port for the NestJS HTTP listener                      |
| `DATABASE_URL`   | String | `postgresql://...`                            | PostgreSQL connection string                           |
| `JWT_SECRET`     | String | _(Required in prod)_                          | Secret key for signing session tokens                  |
| `COOKIE_SECRET`  | String | _(Required in prod)_                          | Signing secret for HTTP-only cookies                   |
| `CORS_ORIGIN`    | String | `http://localhost:3000,http://localhost:3001` | Allowed frontend origins (comma-separated)             |
| `THROTTLE_TTL`   | Number | `60`                                          | Rate limiter window in seconds                         |
| `THROTTLE_LIMIT` | Number | `100`                                         | Max requests per IP within the TTL window              |

---

## 4. Database Schema & Persistence Strategy

The schema is defined in `prisma/schema.prisma` and deployed via explicit SQL migrations (`prisma/migrations/`).

### Core Data Models:

1. **`User` (`users`)**:
   - Customer and staff accounts.
   - `phone` (unique), `email` (unique, optional), `passwordHash` (Argon2id, never exposed), `role` (`CUSTOMER`, `STAFF`, `KITCHEN`, `ADMIN`), `isActive`.
2. **`Session` (`sessions`)**:
   - Server-tracked sessions supporting instant revocation.
   - `tokenHash`, `userId`, `expiresAt`, `ipAddress`, `userAgent`.
3. **`Address` (`addresses`)**:
   - Customer saved delivery locations (`street`, `city`, `state`, `postalCode`, `landmark`, `isDefault`).
4. **`Category` (`categories`)**:
   - Menu categories (`name`, `slug`, `displayOrder`, `isActive`).
5. **`Product` (`products`)**:
   - Pure-vegetarian menu items (`name`, `slug`, `price`, `cuisine`, `isSpicy`, `preparationTime`, `customizationOptions`, `isAvailable`).
6. **`Order` (`orders`)**:
   - Customer orders (`orderNumber`, `customerName`, `customerPhone`, `deliveryAddress`, `status`, `orderType`, `paymentStatus`, `paymentMethod`, `subtotal`, `taxAmount`, `deliveryFee`, `discountAmount`, `totalAmount`).
7. **`OrderItem` (`order_items`)**:
   - **Historical Immutable Snapshot**: Stores `productName`, `unitPrice`, `quantity`, `customization`, `notes`, `subtotal` permanently frozen at time of order.
8. **`AuditLog` (`audit_logs`)**:
   - Immutable security and admin action log.

---

## 5. Security & Request Handling

1. **API Prefix**: All routes are namespaced under `/api` (e.g. `GET /api/health`).
2. **Security Headers**: Managed by `helmet` with strict CSP and frameguard protections.
3. **Body Size Limits**: JSON and URL-encoded bodies are restricted to `1mb` to prevent memory flooding.
4. **CORS Security**: Restricted to verified frontend origins; wildcard (`*`) is prohibited.
5. **Strict DTO Whitelisting**: `ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true })` rejects any unexpected or injected fields (such as `role`, `price`, or `paymentStatus`).
6. **Error Masking**: `AllExceptionsFilter` intercepts uncaught errors, logging the stack trace internally while returning a clean, non-revealing error to the client.
7. **Safe Logging**: `LoggingInterceptor` logs HTTP method, route, status code, and latency. Passwords, session tokens, authorization headers, and payment credentials are never logged.

---

## 6. Server-Authoritative Business Logic Principles

> **Critical Rule**: The client is never the authority for money, prices, discounts, or permissions.

When order APIs are implemented in future phases:

- The frontend will submit dish IDs, variant choices, quantities, and customer instructions.
- The server will query PostgreSQL for official prices, calculate line item subtotals, compute real taxes and delivery fees, and generate the final immutable total.
- Clients cannot supply arbitrary price overrides or mark orders as paid.

---

## 7. Status & Roadmap

### Implemented Now (Foundation Phase):

- [x] NestJS application architecture with TypeScript strict mode.
- [x] Environment validation with startup crash-fast protection.
- [x] Prisma ORM singleton service with graceful lifecycle hooks (`$connect`, `$disconnect`).
- [x] Canonical PostgreSQL schema with historical order snapshots and indexes.
- [x] Initial version-controlled SQL migration (`20260904000000_init`).
- [x] Docker Compose development PostgreSQL 16 container definition.
- [x] `GET /api/health` verifying server and database connectivity.
- [x] Global security headers (Helmet), cookie parser, and 1MB request limits.
- [x] Strict validation pipe with field whitelisting.
- [x] Sanitized global exception filter and privacy-compliant HTTP logging.

### Planned for Future Phases:

- [ ] Customer Authentication API (`/api/auth/*`) with Argon2id and HTTP-only session cookies.
- [ ] Menu API (`/api/menu/*`) with PostgreSQL catalog integration.
- [ ] Server-authoritative Order API (`/api/orders/*`) with transaction isolation.
- [ ] Payment Gateway integration (Razorpay / UPI webhooks).
- [ ] Admin & Kitchen live order dashboard APIs.
