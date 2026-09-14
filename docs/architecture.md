# Architecture Documentation

## 1. System Overview

**Family Vaishno Dhaba** is a production-grade online food ordering platform designed specifically for a single restaurant serving authentic Punjabi and Himachali pure vegetarian cuisine.

It is **NOT** a multi-vendor marketplace (like Swiggy or Zomato). The architecture avoids all multi-tenant or multi-vendor abstractions, keeping domain logic clean, efficient, and tailored to a single high-throughput restaurant operation.

---

## 2. Monorepo Structure

We use standard **npm workspaces** orchestrated with **Turborepo** for unified dependency management, zero external tool requirements, and optimized build caching.

```
family-vaishno-dhaba/
├── apps/
│   ├── api/            # NestJS Backend API Service
│   ├── web/            # Next.js Customer Facing Web Application (RSC default)
│   └── admin/          # Next.js Admin & Kitchen Operations Portal
├── packages/
│   ├── config/         # Shared TypeScript, Prettier, and styling configurations
│   ├── types/          # Shared domain types, DTOs, and API contract interfaces
│   └── ui/             # Shared Tailwind CSS UI component primitives
├── prisma/
│   ├── schema.prisma   # PostgreSQL source of truth data schema
│   └── migrations/     # Versioned database migration history
├── docs/               # Architectural, database, security, and developer guides
├── docker/
│   └── docker-compose.yml # Local PostgreSQL development environment
├── .env.example        # Environment variable template
└── turbo.json          # Pipeline execution rules and caching
```

---

## 3. Technology Stack Rationale

| Layer        | Technology                                  | Key Rationale                                                                                                                                   |
| ------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------- |
| **Backend**  | NestJS / Node.js / TypeScript               | Modular domain structure, enterprise-grade dependency injection, built-in validation, and clear separation of concerns.                         |
| **Frontend** | Next.js (App Router) / React / Tailwind CSS | Server Components by default for optimal Core Web Vitals (LCP/INP), SEO friendliness, and zero client JS footprint for static/content sections. |
| **Database** | PostgreSQL 16                               | ACID-compliant relational integrity for financial snapshots, orders, transactions, and robust indexing.                                         |
| **ORM**      | Prisma                                      | Type-safe database queries, declarative schema migrations, and high developer ergonomics.                                                       |
| **Security** | Argon2id, Helmet, Cookie-parser, Throttler  | Defense-in-depth from the ground up. HTTP-only cookies prevent client XSS token leakage.                                                        |

---

## 4. Architectural Principles

1. **Simplicity over Abstraction**: No premature abstractions, no generic repository layers over Prisma, no unnecessary design patterns.
2. **Server is the Single Source of Truth**: The client only expresses user intent (e.g., item IDs, quantities). The server calculates prices, subtotals, taxes, delivery fees, and discounts strictly from the database.
3. **Immutability of Orders**: Order items snapshot item names and unit prices at the time of order creation. Future menu price updates will never alter historical financial records.
4. **Fail-Fast Environment Validation**: All critical environment variables are validated at startup before the application accepts any incoming traffic.
