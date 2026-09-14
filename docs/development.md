# Local Development Guide

## 1. Prerequisites

- **Node.js**: `v20.x` or `v22.x` (verified on v22)
- **npm**: `v10.x` or higher
- **Docker & Docker Compose**: For local PostgreSQL instance

---

## 2. Getting Started

### 1. Clone & Install Dependencies

```bash
npm install
```

### 2. Configure Environment Variables

Copy `.env.example` to `.env`:

```bash
cp .env.example .env
```

### 3. Start PostgreSQL with Docker

```bash
npm run db:up
```

Verify container health:

```bash
docker ps --filter "name=fvd_postgres"
```

### 4. Run Database Migrations & Generate Prisma Client

```bash
npm run db:migrate
npm run db:generate
```

### 5. Start Development Servers

```bash
npm run dev
```

The services will be accessible at:

- **Customer Web App**: [http://localhost:3000](http://localhost:3000)
- **Admin / Kitchen Portal**: [http://localhost:3001](http://localhost:3001)
- **Backend API**: [http://localhost:4000/api](http://localhost:4000/api)
- **Health Check Endpoint**: [http://localhost:4000/api/health](http://localhost:4000/api/health)
- **Prisma Studio**: `npm run db:studio` (http://localhost:5555)

---

## 3. Useful Scripts

| Command               | Action                                          |
| --------------------- | ----------------------------------------------- |
| `npm run dev`         | Start all apps in parallel using Turbo          |
| `npm run build`       | Build all apps and packages                     |
| `npm run lint`        | Run ESLint / TypeScript linting across monorepo |
| `npm run type-check`  | Run `tsc --noEmit` across all apps and packages |
| `npm run db:up`       | Spin up local PostgreSQL container              |
| `npm run db:down`     | Stop PostgreSQL container                       |
| `npm run db:migrate`  | Apply Prisma schema migrations                  |
| `npm run db:generate` | Regenerate Prisma client                        |
| `npm run db:studio`   | Launch visual database editor                   |
