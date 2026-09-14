# Family Vaishno Dhaba 🍲

> Production-grade online food ordering platform for **Family Vaishno Dhaba** — serving authentic, homestyle pure vegetarian Punjabi and Himachali delicacies.

---

## Architecture Overview

- **Frontend**: Next.js 15+ (App Router, Server Components by default, Tailwind CSS)
- **Backend API**: NestJS 11+ (TypeScript, modular domain design, global validation, security interceptors)
- **Database**: PostgreSQL 16 (via Docker Compose) with Prisma ORM and strict schema migrations
- **Monorepo**: npm workspaces + Turborepo for parallel execution and build caching

---

## Repository Structure

```
family-vaishno-dhaba/
├── apps/
│   ├── api/            # NestJS Backend API Service (port 4000)
│   ├── web/            # Next.js Customer Web App (port 3000)
│   └── admin/          # Next.js Admin & Kitchen Operations Portal (port 3001)
├── packages/
│   ├── config/         # Shared TypeScript, ESLint, and Prettier configurations
│   ├── types/          # Shared domain types, DTOs, and API contract interfaces
│   └── ui/             # Reusable UI component library primitives
├── prisma/
│   ├── schema.prisma   # PostgreSQL source of truth schema
│   └── migrations/     # Versioned database migrations
├── docs/               # Comprehensive technical documentation
│   ├── architecture.md # Monorepo design, module structure, and boundaries
│   ├── security.md     # Authentication, cookies, rate limiting, and RBAC
│   ├── database.md     # PostgreSQL schema, indexing, and immutability rules
│   └── development.md  # Step-by-step developer setup guide
├── docker/
│   └── docker-compose.yml # PostgreSQL 16 local container configuration
├── .env.example        # Environment configuration template
└── turbo.json          # Turbo build caching & task orchestration
```

---

## Quick Start

### 1. Install Dependencies

```bash
npm install
```

### 2. Configure Environment

```bash
cp .env.example .env
```

### 3. Start Database

```bash
npm run db:up
```

### 4. Apply Database Migrations & Generate Prisma Client

```bash
npm run db:migrate
npm run db:generate
```

### 5. Start Development Servers

```bash
npm run dev
```

- **Customer App**: [http://localhost:3000](http://localhost:3000)
- **Admin App**: [http://localhost:3001](http://localhost:3001)
- **Backend API**: [http://localhost:4000/api](http://localhost:4000/api)
- **Health Check**: [http://localhost:4000/api/health](http://localhost:4000/api/health)

---

## Documentation Links

- 📐 [Architecture Guide](docs/architecture.md)
- 🔒 [Security Guidelines](docs/security.md)
- 🗄️ [Database & Schema](docs/database.md)
- 💻 [Development Workflow](docs/development.md)
