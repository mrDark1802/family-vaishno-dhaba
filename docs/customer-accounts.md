# Customer Addresses & Order History Documentation

## 1. Overview

The Customer Addresses and Order History architecture provides registered Family Vaishno Dhaba customers with seamless address management, persistent order tracking, and receipt viewing. It strictly adheres to security best practices, zero data coupling with historical order records, and seamless guest checkout fallback.

---

## 2. Key Architecture Principles

### 2.1 Server-Authoritative Ownership Isolation

- All address creation, mutation, and queries derive `userId` strictly from the authenticated session context (`@CurrentUser()`).
- Client-supplied `userId` parameters in request bodies or query parameters are ignored and rejected.
- Any attempt to access, modify, or delete another user's address or order returns a `404 Not Found` (rather than a `403 Forbidden`) to prevent resource existence enumeration.

### 2.2 Atomic Default Address Management

- When an address is marked as default (either on creation, edit, or explicitly via `/api/addresses/:id/default`), all other addresses for the same user have their `isDefault` flag atomically unset within a single database transaction (`prisma.$transaction`).
- When the active default address is deleted, the service automatically selects and promotes the user's most recent remaining address to default status.
- First address created by a customer is automatically set as `isDefault = true`.

### 2.3 Historical Order Snapshot Immutability

- Orders contain a standalone string snapshot `deliveryAddress` recorded at checkout creation time.
- Modifying or deleting a customer's saved address **never** mutates or cascades onto historical orders. Historical records remain 100% immutable financial/audit records.

### 2.4 Guest Checkout Preservation

- Guest users continue to place delivery orders by supplying recipient details directly.
- Logged-in customers can choose from their saved addresses or input a one-off custom delivery address directly during checkout.

---

## 3. Database Schema

```prisma
model Address {
  id            String   @id @default(uuid())
  userId        String
  user          User     @relation(fields: [userId], references: [id], onDelete: Cascade)
  label         String   // e.g. "Home", "Office", "Other"
  recipientName String
  phone         String
  house         String   // Flat, House No., Building
  street        String   // Street, Area, Colony
  landmark      String?  // Optional Landmark
  city          String   @default("Pehowa")
  state         String   @default("Haryana")
  postalCode    String   @default("136128")
  isDefault     Boolean  @default(false)
  createdAt     DateTime @default(now())
  updatedAt     DateTime @updatedAt

  @@index([userId, isDefault])
}
```

---

## 4. Backend API Endpoints

### 4.1 Address Management (`/api/addresses`)

_All endpoints require authenticated session cookie (`JwtAuthGuard`)._

| Method   | Endpoint                     | Description                                                                                   |
| -------- | ---------------------------- | --------------------------------------------------------------------------------------------- |
| `GET`    | `/api/addresses`             | List all saved addresses for the authenticated user, ordered default first, then newest.      |
| `POST`   | `/api/addresses`             | Create a new address. `userId` derived from session.                                          |
| `PATCH`  | `/api/addresses/:id`         | Update address fields. Atomically manages default flag if set.                                |
| `DELETE` | `/api/addresses/:id`         | Delete address. Automatically promotes next newest address to default if default was deleted. |
| `POST`   | `/api/addresses/:id/default` | Atomically set specified address as the user's primary default address.                       |

### 4.2 Order History & Receipts (`/api/orders`)

_Protected by `JwtAuthGuard`._

| Method | Endpoint                    | Description                                                                        |
| ------ | --------------------------- | ---------------------------------------------------------------------------------- |
| `GET`  | `/api/orders/my-orders`     | Paginated list of customer's own orders (`?page=1&limit=10`).                      |
| `GET`  | `/api/orders/my-orders/:id` | Detailed order receipt by ID or `orderNumber`. Enforces strict customer ownership. |

---

## 5. Frontend Pages & Components

| Path / Component       | Description                                                                                                               |
| ---------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `/account`             | Customer overview dashboard linking to Addresses, Orders, Profile, and Security.                                          |
| `/account/addresses`   | Complete address management UI with modal forms for creation/editing, default address badges, and deletion confirmations. |
| `/account/orders`      | Paginated customer order history cards with real-time status badges, summary metrics, and item counts.                    |
| `/account/orders/[id]` | Detailed receipt page with live order timeline, item breakdown, price calculations, and delivery address snapshot.        |
| `<AccountNav />`       | Unified navigation tab bar across all account management sections.                                                        |
| `/checkout`            | Enhanced checkout page with dynamic saved address selection cards and a fallback manual entry toggle.                     |

---

## 6. Verification & Automated Testing

The automated test script `scripts/verify-customer-accounts.ts` validates:

1. **Address Creation & Default Atomicity**: Automatic first-default assignment, atomicity of updating defaults, and promotion upon default deletion.
2. **Cross-Customer Address Isolation**: Rejection of cross-user read, update, delete, and set-default requests with `404 Not Found`.
3. **Order Ownership & Detail Security**: Rejection of unauthorized order lookup by ID or orderNumber.
4. **Historical Snapshot Immutability**: Verification that order receipt snapshots remain completely untouched after modifying or deleting the underlying saved address.
5. **Server-Side Pagination**: Accurate calculation of `total`, `page`, `totalPages`, `hasNextPage`, and `hasPrevPage`.
