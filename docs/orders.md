# Orders & Server-Authoritative Pricing Architecture

## 1. Core Security & Design Principles

### Zero-Trust Client Pricing

The Family Vaishno Dhaba ordering engine strictly adheres to a **zero-trust model for client input**:

- **No Client Prices Accepted**: The client never transmits item prices, customization surcharges, line totals, subtotal, delivery charges, or taxes.
- **Server Reconstruction**: The server queries PostgreSQL for each `productId`, verifies item status (`isActive` and `isAvailable`), validates customization choices against the authoritative `customizationOptions` JSON schema, and computes unit prices and totals on the server.
- **Immutable Snapshots**: Line items store immutable historical snapshots (`productName`, `baseUnitPrice`, `customization`, `customizationPrice`, `unitPrice`, `quantity`, `subtotal`) in `order_items` so that future menu or pricing modifications never alter past order records.

---

## 2. Order Creation Flow

```mermaid
sequenceDiagram
    autonumber
    actor Customer as Customer (Web / Mobile)
    participant Cart as Cart / Checkout
    participant API as NestJS OrdersController
    participant Service as OrdersService
    participant DB as PostgreSQL (Prisma)

    Customer->>Cart: Review Items & Submit Checkout
    Cart->>API: POST /api/orders (Idempotency-Key Header, items, contact, address)

    rect rgb(240, 248, 255)
    Note over API,DB: Server-Authoritative Execution
    API->>Service: createOrder(dto, userId?, idempotencyKey?)
    Service->>DB: Check idempotencyKey in orders
    alt Key already exists
        Service-->>API: Return existing order (No duplicate billing)
    else New submission
        Service->>DB: Fetch Products by IDs (isActive, isAvailable)
        Service->>Service: Validate availability & bounds (qty 1..20)
        Service->>Service: Validate customization against product JSON schema
        Service->>Service: Compute line subtotals & financial breakdown
        Service->>Service: Generate orderNumber (FVD-YYYYMMDD-XXXX)
        Service->>DB: prisma.$transaction (Order + OrderItems)
        DB-->>Service: Committed Order Record
    end
    end

    Service-->>API: Typed OrderResponse
    API-->>Cart: 201 Created (OrderResponse)
    Cart->>Customer: Clear Cart & Redirect to /order/:orderNumber
```

---

## 3. Idempotency & Concurrency Protection

To prevent duplicate orders due to client retries, double clicks, or flaky cellular networks:

1. The frontend generates a unique `Idempotency-Key` (UUID v4) on initial checkout submission.
2. The key is stored as a `@unique` index on the `orders` table in PostgreSQL.
3. If a request arrives with an existing `idempotencyKey`, `OrdersService` returns the previously created order safely without creating new database rows or generating duplicate charges.

---

## 4. Fulfillment & Address Rules

- **DELIVERY**: Requires valid `deliveryAddress` (minimum 5 characters), `city`, and a 6-digit Indian PIN code (`/^\d{6}$/`).
- **TAKEAWAY**: Pickup directly from the dhaba kitchen desk (Kangra Main Chowk). Address fields are not required.

---

## 5. Endpoints Specification

| Method | Path                      | Auth Guard    | Description                                                                             |
| :----- | :------------------------ | :------------ | :-------------------------------------------------------------------------------------- |
| `POST` | `/api/orders`             | Optional      | Create new order (supports guest and authenticated users) with `Idempotency-Key` header |
| `GET`  | `/api/orders/:identifier` | Public        | Retrieve live order status and snapshot details by `orderNumber` or `id`                |
| `GET`  | `/api/orders/my-orders`   | Authenticated | Retrieve authenticated customer's past order history                                    |

---

## 6. Automated Test Suite

To run the automated pricing and constraint verification tests:

```bash
npx tsx scripts/verify-orders.ts
```
