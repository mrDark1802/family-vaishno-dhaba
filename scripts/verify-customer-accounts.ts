import { AddressesService } from "../src/modules/addresses/addresses.service";
import { OrdersService } from "../src/modules/orders/orders.service";
import { CreateAddressDto } from "../src/modules/addresses/dto/create-address.dto";
import { CreateOrderDto } from "../src/modules/orders/dto/create-order.dto";
import {
  OrderType,
  PaymentMethod,
  OrderStatus,
  PaymentStatus,
} from "@repo/types";
import { Prisma } from "@prisma/client";

// In-Memory Mock Database for Addresses & Orders Verification
class MockPrismaService {
  public products: any[] = [
    {
      id: "dish-siddu-ghee",
      name: "Himachali Siddu with Pure Desi Ghee",
      slug: "himachali-siddu-ghee",
      price: new Prisma.Decimal(180),
      isActive: true,
      isAvailable: true,
      customizationOptions: null,
    },
  ];

  public addresses: any[] = [];
  public orders: any[] = [];
  public orderItems: any[] = [];

  public address = {
    findMany: async ({ where, orderBy }: any) => {
      let list = this.addresses.filter((a) => a.userId === where.userId);
      if (orderBy) {
        list.sort((a, b) => {
          if (a.isDefault === b.isDefault) {
            return b.createdAt.getTime() - a.createdAt.getTime();
          }
          return a.isDefault ? -1 : 1;
        });
      }
      return list;
    },
    findFirst: async ({ where, orderBy }: any) => {
      let list = this.addresses.filter((a) => {
        if (where.id && a.id !== where.id) return false;
        if (where.userId && a.userId !== where.userId) return false;
        return true;
      });
      if (orderBy?.createdAt === "desc") {
        list.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return list[0] || null;
    },
    count: async ({ where }: any) => {
      return this.addresses.filter((a) => a.userId === where.userId).length;
    },
    updateMany: async ({ where, data }: any) => {
      let count = 0;
      this.addresses.forEach((a) => {
        if (
          a.userId === where.userId &&
          (where.isDefault === undefined || a.isDefault === where.isDefault)
        ) {
          Object.assign(a, data);
          count++;
        }
      });
      return { count };
    },
    create: async ({ data }: any) => {
      const created = {
        id: `addr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.addresses.push(created);
      return created;
    },
    update: async ({ where, data }: any) => {
      const addr = this.addresses.find((a) => a.id === where.id);
      if (!addr) throw new Error("Address not found");
      Object.assign(addr, data, { updatedAt: new Date() });
      return addr;
    },
    delete: async ({ where }: any) => {
      const idx = this.addresses.findIndex((a) => a.id === where.id);
      if (idx !== -1) {
        const deleted = this.addresses.splice(idx, 1)[0];
        return deleted;
      }
      throw new Error("Address not found");
    },
  };

  public product = {
    findMany: async ({ where }: any) => {
      const ids: string[] = where?.id?.in || [];
      return this.products.filter((p) => ids.includes(p.id));
    },
  };

  public order = {
    count: async ({ where }: any) => {
      return this.orders.filter((o) => o.userId === where.userId).length;
    },
    findUnique: async ({ where }: any) => {
      if (where.idempotencyKey) {
        return (
          this.orders.find((o) => o.idempotencyKey === where.idempotencyKey) ||
          null
        );
      }
      if (where.id) {
        return this.orders.find((o) => o.id === where.id) || null;
      }
      return null;
    },
    findFirst: async ({ where }: any) => {
      return (
        this.orders.find((o) => {
          if (where.userId && o.userId !== where.userId) return false;
          if (where.OR) {
            return where.OR.some(
              (c: any) =>
                (c.id && o.id === c.id) ||
                (c.orderNumber && o.orderNumber === c.orderNumber),
            );
          }
          return true;
        }) || null
      );
    },
    findMany: async ({ where, skip = 0, take = 20 }: any) => {
      const list = this.orders
        .filter((o) => o.userId === where.userId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      return list.slice(skip, skip + take);
    },
  };

  public $transaction = async (callback: (tx: any) => Promise<any>) => {
    const tx = {
      address: this.address,
      order: {
        create: async ({ data }: any) => {
          const orderId = `ord-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
          const itemsData = data.items?.create || [];
          const createdItems = itemsData.map((it: any) => ({
            id: `item-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
            orderId,
            ...it,
            createdAt: new Date(),
          }));

          const createdOrder = {
            id: orderId,
            orderNumber: data.orderNumber,
            userId: data.userId || null,
            customerName: data.customerName,
            customerPhone: data.customerPhone,
            customerEmail: data.customerEmail || null,
            deliveryAddress: data.deliveryAddress || null,
            landmark: data.landmark || null,
            city: data.city || null,
            pincode: data.pincode || null,
            status: data.status || OrderStatus.PENDING,
            orderType: data.orderType,
            paymentStatus: data.paymentStatus || PaymentStatus.PENDING,
            paymentMethod: data.paymentMethod || PaymentMethod.CASH_ON_DELIVERY,
            subtotal: data.subtotal,
            deliveryFee: data.deliveryFee,
            taxAmount: data.taxAmount,
            discountAmount: data.discountAmount,
            totalAmount: data.totalAmount,
            notes: data.notes || null,
            idempotencyKey: data.idempotencyKey || null,
            createdAt: new Date(),
            updatedAt: new Date(),
            items: createdItems,
          };

          this.orders.push(createdOrder);
          this.orderItems.push(...createdItems);
          return createdOrder;
        },
      },
    };

    return callback(tx);
  };
}

async function runVerification() {
  console.log(
    "=== STARTING CUSTOMER ADDRESSES & SECURE ORDER HISTORY VERIFICATION ===\n",
  );

  const mockPrisma = new MockPrismaService();
  const addressesService = new AddressesService(mockPrisma as any);
  const mockVerificationService: any = {
    validateAndConsumeToken: async () => {},
  };
  const ordersService = new OrdersService(
    mockPrisma as any,
    mockVerificationService,
  );

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, testName: string, details?: any) {
    totalTests++;
    if (condition) {
      console.log(`✅ [PASS] ${testName}`);
      passedTests++;
    } else {
      console.error(`❌ [FAIL] ${testName}`, details || "");
      throw new Error(`Test failed: ${testName}`);
    }
  }

  // --- SECTION 1: Address Management & Default Atomicity ---
  console.log("--- 1. Address Creation & Atomic Default Handling ---");

  // User A creates Address 1 (first address -> auto default)
  const addr1 = await addressesService.create("user-a", {
    label: "Home",
    recipientName: "Gurpreet Singh",
    phone: "9816054321",
    street: "Flat 101, Kangra Heights",
    postalCode: "176001",
  });
  assert(
    addr1.isDefault === true,
    "First address automatically set as default",
  );
  assert(addr1.userId === "user-a", "Address associated with user-a");

  // User A creates Address 2 with isDefault: true
  const addr2 = await addressesService.create("user-a", {
    label: "Office",
    recipientName: "Gurpreet Singh",
    phone: "9816054321",
    street: "Shop 4, Main Market, Kangra",
    postalCode: "176001",
    isDefault: true,
  });
  assert(addr2.isDefault === true, "Address 2 set as default");

  // Check that Address 1 was atomically unset as default
  const listAfterAdd2 = await addressesService.list("user-a");
  const checkAddr1 = listAfterAdd2.find((a) => a.id === addr1.id);
  const checkAddr2 = listAfterAdd2.find((a) => a.id === addr2.id);
  assert(
    checkAddr1?.isDefault === false,
    "Address 1 atomically unset as default",
  );
  assert(checkAddr2?.isDefault === true, "Address 2 remains default");

  // Set Address 1 as default via setDefault()
  const updatedDefault = await addressesService.setDefault("user-a", addr1.id);
  assert(
    updatedDefault.isDefault === true,
    "Address 1 marked as default via setDefault()",
  );
  const listAfterDefault = await addressesService.list("user-a");
  assert(
    listAfterDefault[0]?.id === addr1.id,
    "Default address is listed first",
  );

  // --- SECTION 2: Address Cross-User Security & Authorization ---
  console.log("\n--- 2. Cross-Customer Address Isolation & Ownership ---");

  // User B creates an address
  const addrB = await addressesService.create("user-b", {
    label: "Farmhouse",
    recipientName: "Vipin Kumar",
    phone: "9816099999",
    street: "Village Dhar, Kangra",
    postalCode: "176001",
  });

  // User A lists addresses: MUST NOT see User B's address
  const userAList = await addressesService.list("user-a");
  assert(
    !userAList.some((a) => a.id === addrB.id),
    "User A cannot view User B's saved address",
  );

  // User A attempts to update User B's address -> MUST throw NotFoundException
  try {
    await addressesService.update("user-a", addrB.id, {
      street: "Hacked Address",
    });
    assert(false, "User A should not be allowed to update User B's address");
  } catch (err: any) {
    assert(
      err.message.includes("unauthorized") || err.message.includes("not found"),
      "Update rejected on unauthorized address",
    );
  }

  // User A attempts to delete User B's address -> MUST throw NotFoundException
  try {
    await addressesService.delete("user-a", addrB.id);
    assert(false, "User A should not be allowed to delete User B's address");
  } catch (err: any) {
    assert(
      err.message.includes("unauthorized") || err.message.includes("not found"),
      "Delete rejected on unauthorized address",
    );
  }

  // User A attempts to set User B's address as default -> MUST throw NotFoundException
  try {
    await addressesService.setDefault("user-a", addrB.id);
    assert(
      false,
      "User A should not be allowed to set User B's address as default",
    );
  } catch (err: any) {
    assert(
      err.message.includes("unauthorized") || err.message.includes("not found"),
      "Set default rejected on unauthorized address",
    );
  }

  // --- SECTION 3: Order History Authorization & Pagination ---
  console.log("\n--- 3. Order History Ownership & Pagination ---");

  // Place Order 1 for User A
  const orderA1 = await ordersService.createOrder(
    {
      items: [{ productId: "dish-siddu-ghee", quantity: 1 }],
      orderType: OrderType.DELIVERY,
      customerName: "Gurpreet Singh",
      customerPhone: "9816054321",
      deliveryAddress: "Flat 101, Kangra Heights",
      city: "Kangra",
      pincode: "176001",
      phoneVerificationToken: "pvt_test",
    },
    "user-a",
  );

  // Place Order 2 for User A
  const orderA2 = await ordersService.createOrder(
    {
      items: [{ productId: "dish-siddu-ghee", quantity: 2 }],
      orderType: OrderType.TAKEAWAY,
      customerName: "Gurpreet Singh",
      customerPhone: "9816054321",
      phoneVerificationToken: "pvt_test",
    },
    "user-a",
  );

  // Place Order 1 for User B
  const orderB1 = await ordersService.createOrder(
    {
      items: [{ productId: "dish-siddu-ghee", quantity: 1 }],
      orderType: OrderType.DELIVERY,
      customerName: "Vipin Kumar",
      customerPhone: "9816099999",
      deliveryAddress: "Village Dhar, Kangra",
      city: "Kangra",
      pincode: "176001",
      phoneVerificationToken: "pvt_test",
    },
    "user-b",
  );

  // User A lists orders -> returns only user A's orders
  const userAOrders = await ordersService.getUserOrders("user-a", 1, 10);
  assert(
    userAOrders.items.length === 2,
    "User A order history contains exactly 2 orders",
  );
  assert(
    !userAOrders.items.some((o) => o.id === orderB1.id),
    "User A cannot see User B's orders",
  );

  // User A queries Order A1 details -> SUCCESS
  const orderDetails = await ordersService.getUserOrderById(
    "user-a",
    orderA1.id,
  );
  assert(
    orderDetails.id === orderA1.id,
    "User A can view their own order details",
  );

  // User A queries Order B1 details -> MUST throw NotFoundException (404/unauthorized)
  try {
    await ordersService.getUserOrderById("user-a", orderB1.id);
    assert(
      false,
      "User A should not be allowed to access User B's order details",
    );
  } catch (err: any) {
    assert(
      err.message.includes("unauthorized") || err.message.includes("not found"),
      "Access to another user's order rejected",
    );
  }

  // --- SECTION 4: Historical Address Snapshot Immutability ---
  console.log("\n--- 4. Historical Delivery Snapshot Immutability ---");

  // User A updates Address 1
  await addressesService.update("user-a", addr1.id, {
    street: "Completely Changed New Street Address 999",
  });

  // Verify Order A1 still contains the original historical delivery address snapshot
  const orderA1Snapshot = await ordersService.getUserOrderById(
    "user-a",
    orderA1.id,
  );
  assert(
    orderA1Snapshot.deliveryAddress === "Flat 101, Kangra Heights",
    "Order delivery address snapshot remains untouched after saved address modification",
  );

  // Delete Address 1
  await addressesService.delete("user-a", addr1.id);
  const orderA1AfterDelete = await ordersService.getUserOrderById(
    "user-a",
    orderA1.id,
  );
  assert(
    orderA1AfterDelete.deliveryAddress === "Flat 101, Kangra Heights",
    "Order delivery address snapshot preserved after saved address deletion",
  );

  // --- SECTION 5: Pagination Verification ---
  console.log("\n--- 5. Server-Side Pagination Logic ---");
  const paginatedPage1 = await ordersService.getUserOrders("user-a", 1, 1);
  assert(
    paginatedPage1.items.length === 1,
    "Page 1 contains 1 order when limit is 1",
  );
  assert(paginatedPage1.pagination.total === 2, "Total orders count is 2");
  assert(paginatedPage1.pagination.totalPages === 2, "Total pages is 2");
  assert(
    paginatedPage1.pagination.hasNextPage === true,
    "hasNextPage is true for page 1",
  );

  const paginatedPage2 = await ordersService.getUserOrders("user-a", 2, 1);
  assert(paginatedPage2.items.length === 1, "Page 2 contains 1 order");
  assert(
    paginatedPage2.pagination.hasNextPage === false,
    "hasNextPage is false for page 2",
  );

  console.log(
    `\n🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`,
  );
}

runVerification().catch((err) => {
  console.error("Verification script failed:", err);
  process.exit(1);
});
