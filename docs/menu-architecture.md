# Family Vaishno Dhaba — Menu Backend Architecture

## 1. Overview & Core Principles

The Menu Backend provides the database-driven foundation for **Family Vaishno Dhaba** (authentic pure-vegetarian Punjabi & Himachali restaurant). It is designed to serve high-performance, strongly typed, and resilient menu data to customer-facing clients and future administrative interfaces.

### Key Tenets

1. **Single-Restaurant Identity**: Tailored exclusively to the culinary offerings of Family Vaishno Dhaba (Kangra/Mandi Himachali Dham + Punjabi Tandoor & Curries).
2. **Server-Authoritative Pricing**: Frontend display prices are advisory for rendering. In future checkout and order creation flows, the NestJS API recalculates and validates all line-item totals strictly from the PostgreSQL database.
3. **High Resiliency & Graceful Degradation**: The frontend includes a type-safe adapter layer (`apps/web/src/lib/api-menu.ts`) that gracefully falls back to static seed data if the backend server is temporarily unavailable or during static site builds.
4. **Idempotent Data Seeding**: Prisma seed script (`prisma/seed.ts`) uses `upsert` semantics to guarantee that re-running migrations and seeds never duplicates categories or dishes and maintains fixed identifiers.

---

## 2. PostgreSQL Schema & Prisma Data Models

The database models are defined in [`prisma/schema.prisma`](../prisma/schema.prisma):

```prisma
enum RegionalCuisine {
  PUNJABI
  HIMACHALI
  COMMON
}

model Category {
  id           String    @id @default(cuid())
  name         String
  slug         String    @unique
  description  String?
  icon         String?   // Emoji or icon name (e.g., "🏔️", "🧈")
  featured     Boolean   @default(false)
  displayOrder Int       @default(0)
  isActive     Boolean   @default(true)
  createdAt    DateTime  @default(now())
  updatedAt    DateTime  @updatedAt

  products     Product[]

  @@index([slug])
  @@index([isActive, displayOrder])
}

model Product {
  id                   String          @id @default(cuid())
  categoryId           String
  name                 String
  slug                 String          @unique
  description          String?
  longDescription      String?
  price                Decimal         @db.Decimal(10, 2)
  isAvailable          Boolean         @default(true)
  isActive             Boolean         @default(true)
  isChefSpecial        Boolean         @default(false)
  cuisine              RegionalCuisine @default(COMMON)
  isSpicy              Boolean         @default(false)
  preparationTime      String?         // e.g. "20-25 mins"
  serves               String?         // e.g. "Serves 1-2"
  customizationOptions Json?           // [{ name: string, choices: [{ name: string, price: number }] }]
  imageUrl             String?
  displayOrder         Int             @default(0)
  createdAt            DateTime        @default(now())
  updatedAt            DateTime        @updatedAt

  category             Category        @relation(fields: [categoryId], references: [id], onDelete: Restrict)
  orderItems           OrderItem[]

  @@index([categoryId])
  @@index([slug])
  @@index([cuisine])
  @@index([isActive, isAvailable])
}
```

---

## 3. Public API Specification

All endpoints are hosted under the global prefix `/api` and return standardized responses handled by NestJS interceptors:

### 3.1 List Categories

- **Endpoint**: `GET /api/menu/categories`
- **Description**: Returns all active categories ordered by `displayOrder` ascending.
- **Response Format**:

```json
{
  "success": true,
  "data": [
    {
      "id": "cat-himachali",
      "name": "Himachali Dham Specials",
      "slug": "himachali-dham",
      "description": "Traditional slow-cooked recipes from the valleys of Kangra and Mandi",
      "icon": "🏔️",
      "featured": true,
      "displayOrder": 1,
      "isActive": true
    }
  ],
  "timestamp": "2026-09-04T12:00:00.000Z"
}
```

### 3.2 List Menu Items (with filters)

- **Endpoint**: `GET /api/menu`
- **Query Parameters**:
  - `category` (optional, string): Filter by category slug (e.g. `himachali-dham`) or category ID.
  - `cuisine` (optional, enum): Filter by `PUNJABI`, `HIMACHALI`, or `COMMON` (case-insensitive).
  - `search` (optional, string): Full-text substring search across dish name, description, and long description.
- **Response Format**:

```json
{
  "success": true,
  "data": [
    {
      "id": "dish-siddu-ghee",
      "categoryId": "cat-himachali",
      "name": "Traditional Himachali Siddu",
      "slug": "traditional-himachali-siddu",
      "description": "Fluffy steamed wheat bun stuffed with spiced poppy seeds and walnuts, served with authentic pure desi ghee.",
      "longDescription": "A revered ceremonial delicacy of Kullu and Mandi...",
      "price": 180,
      "isAvailable": true,
      "isChefSpecial": true,
      "cuisine": "HIMACHALI",
      "isSpicy": false,
      "preparationTime": "20-25 mins",
      "serves": "Serves 1",
      "customizationOptions": [
        {
          "name": "Desi Ghee Portion",
          "choices": [
            { "name": "Standard (30ml)", "price": 0 },
            { "name": "Extra Desi Ghee (60ml)", "price": 40 }
          ]
        }
      ],
      "imageUrl": "/images/dishes/himachali-siddu.jpg",
      "displayOrder": 1,
      "category": {
        "id": "cat-himachali",
        "name": "Himachali Dham Specials",
        "slug": "himachali-dham",
        "icon": "🏔️",
        "featured": true,
        "displayOrder": 1,
        "isActive": true
      }
    }
  ],
  "timestamp": "2026-09-04T12:00:00.000Z"
}
```

### 3.3 Get Single Item Details

- **Endpoint**: `GET /api/menu/:id`
- **Parameters**: `id` can be either the primary key `id` (e.g., `dish-siddu-ghee`) or the URL slug (e.g., `traditional-himachali-siddu`).
- **Error Codes**:
  - `404 Not Found`: If the item does not exist or has `isActive: false`.

---

## 4. Frontend Integration & Compatibility

The frontend communicates with the Menu API via `apps/web/src/lib/api-menu.ts`:

- **`fetchCategories()`**: Calls `/api/menu/categories` with a 60-second revalidation cache.
- **`fetchMenuItems(filter)`**: Calls `/api/menu` with parsed query strings and a 30-second revalidation cache.
- **`fetchMenuItemById(id)`**: Calls `/api/menu/:id` for individual dish views.
- **Cart State Isolation**: Dish objects in the cart context (`CartItem`) retain fixed identifiers matching `Product.id`. Stale items or price discrepancies are reconciled against the database during order submission.

---

## 5. Security & Performance Guardrails

1. **Rate Limiting**: Throttled globally via `@nestjs/throttler` (default: 100 requests per 60s per IP).
2. **Input Validation**: All incoming query and route parameters validated using `class-validator` and `class-transformer` with `whitelist: true` and `transform: true`.
3. **SQL Injection Prevention**: Prisma ORM with parameterized queries.
4. **Database Indexes**: Composite index on `[isActive, displayOrder]` and `[isActive, isAvailable]` to ensure sub-millisecond retrieval on large menus.
