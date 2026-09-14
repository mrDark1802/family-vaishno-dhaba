import { OrdersService } from "../src/modules/orders/orders.service";
import { CreateOrderDto } from "../src/modules/orders/dto/create-order.dto";
import {
  OrderType,
  PaymentMethod,
  OrderStatus,
  PaymentStatus,
} from "@repo/types";
import { Prisma } from "@prisma/client";

// In-Memory Mock Database for OrdersService Verification
class MockPrismaService {
  public products: any[] = [
    {
      id: "dish-siddu-ghee",
      name: "Himachali Siddu with Pure Desi Ghee",
      slug: "himachali-siddu-ghee",
      price: new Prisma.Decimal(180),
      isActive: true,
      isAvailable: true,
      customizationOptions: [
        {
          name: "Stuffing Style",
          choices: [
            { name: "Traditional Walnut & Poppy Seed", price: 0 },
            { name: "Extra Ghee & Paneer", price: 40 },
          ],
        },
      ],
    },
    {
      id: "dish-dal-makhani",
      name: "Slow Cooked Dal Makhani",
      slug: "dal-makhani",
      price: new Prisma.Decimal(240),
      isActive: true,
      isAvailable: true,
      customizationOptions: [
        {
          name: "Butter Level",
          choices: [
            { name: "Regular Butter", price: 0 },
            { name: "Extra Desi White Butter", price: 30 },
          ],
        },
      ],
    },
    {
      id: "dish-out-of-stock",
      name: "Seasonal Khatta Meat Alternative",
      slug: "seasonal-khatta",
      price: new Prisma.Decimal(260),
      isActive: true,
      isAvailable: false, // Out of stock
      customizationOptions: null,
    },
  ];

  public orders: any[] = [];
  public orderItems: any[] = [];

  public product = {
    findMany: async ({ where }: any) => {
      const ids: string[] = where?.id?.in || [];
      return this.products.filter((p) => ids.includes(p.id));
    },
  };

  public order = {
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
      if (where?.OR) {
        for (const condition of where.OR) {
          if (condition.id) {
            const found = this.orders.find((o) => o.id === condition.id);
            if (found) return found;
          }
          if (condition.orderNumber) {
            const found = this.orders.find(
              (o) => o.orderNumber === condition.orderNumber,
            );
            if (found) return found;
          }
        }
      }
      return null;
    },
    findMany: async ({ where }: any) => {
      return this.orders.filter((o) => o.userId === where.userId);
    },
    count: async ({ where }: any) => {
      return this.orders.filter((o) => !where?.userId || o.userId === where.userId).length;
    },
  };

  public $transaction = async (callback: (tx: any) => Promise<any>) => {
    const tx = {
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

async function runOrderVerificationTests() {
  console.log("=== STARTING ORDER CREATION & SERVER PRICING VERIFICATION ===");

  const mockPrisma = new MockPrismaService();
  const mockVerificationService: any = {
    validateAndConsumeToken: async (phone: string, token: string) => {
      if (!token || !token.startsWith("pvt_")) {
        throw new Error("Invalid mobile verification token");
      }
    },
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

  // TEST 1: Server-Authoritative Pricing with Customization Calculation
  console.log("\n--- TEST 1: Server Pricing & Customization Calculation ---");
  const validOrderPayload: CreateOrderDto = {
    items: [
      {
        productId: "dish-siddu-ghee", // Base ₹180 + Customization ₹40 = ₹220
        quantity: 2, // 2 * ₹220 = ₹440
        customization: "Extra Ghee & Paneer",
        notes: "Serve piping hot",
      },
      {
        productId: "dish-dal-makhani", // Base ₹240
        quantity: 1, // 1 * ₹240 = ₹240
        notes: "Less spicy",
      },
    ],
    orderType: OrderType.DELIVERY,
    customerName: "Gurpreet Singh",
    customerPhone: "9816054321",
    customerEmail: "gurpreet@example.com",
    deliveryAddress: "Flat 402, Pine View Apartments",
    city: "Kangra",
    pincode: "176001",
    paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
    phoneVerificationToken: "pvt_test_valid_token",
  };

  const order1 = await ordersService.createOrder(
    validOrderPayload,
    "user-gurpreet-123",
    "idemp-key-001",
  );

  assert(
    order1.orderNumber.startsWith("FVD-"),
    "Order number format FVD-YYYYMMDD-XXXX",
  );
  assert(order1.subtotal === 680, `Subtotal ₹680 (got ${order1.subtotal})`);
  assert(
    order1.totalAmount === 680,
    `Total Amount ₹680 (got ${order1.totalAmount})`,
  );
  assert(order1.items.length === 2, "Items count 2");
  assert(order1.items[0]?.baseUnitPrice === 180, "Base unit price ₹180");
  assert(
    order1.items[0]?.customizationPrice === 40,
    "Customization adjustment +₹40",
  );
  assert(order1.items[0]?.unitPrice === 220, "Authoritative unit price ₹220");
  assert(order1.items[0]?.subtotal === 440, "Line subtotal ₹440");
  assert(
    order1.userId === "user-gurpreet-123",
    "User ID associated with authenticated session",
  );

  // TEST 2: Idempotency Protection on Duplicate Submission
  console.log("\n--- TEST 2: Idempotency-Key Duplicate Submission ---");
  const order1Duplicate = await ordersService.createOrder(
    validOrderPayload,
    "user-gurpreet-123",
    "idemp-key-001", // Identical key
  );
  assert(
    order1Duplicate.id === order1.id,
    "Duplicate submission returns existing order ID",
  );
  assert(
    order1Duplicate.orderNumber === order1.orderNumber,
    "Duplicate submission returns same order number",
  );
  assert(
    mockPrisma.orders.length === 1,
    "Only 1 order created in database (no duplicate billing)",
  );

  // TEST 3: Guest Checkout Support
  console.log("\n--- TEST 3: Guest Checkout (userId is null) ---");
  const guestPayload: CreateOrderDto = {
    items: [
      {
        productId: "dish-dal-makhani",
        quantity: 1,
      },
    ],
    orderType: OrderType.TAKEAWAY,
    customerName: "Amit Sharma",
    customerPhone: "9816099999",
    phoneVerificationToken: "pvt_test_valid_token",
  };

  const guestOrder = await ordersService.createOrder(
    guestPayload,
    null,
    "idemp-guest-001",
  );
  assert(guestOrder.userId === null, "Guest order userId is null");
  assert(guestOrder.orderType === OrderType.TAKEAWAY, "Order type is TAKEAWAY");
  assert(guestOrder.totalAmount === 240, "Guest order total is ₹240");

  // TEST 4: Invalid Customization Rejection
  console.log("\n--- TEST 4: Invalid Customization Option Rejection ---");
  const badCustomPayload: CreateOrderDto = {
    items: [
      {
        productId: "dish-siddu-ghee",
        quantity: 1,
        customization: "Fake Nonexistent Topping",
      },
    ],
    orderType: OrderType.TAKEAWAY,
    customerName: "Test User",
    customerPhone: "9816011111",
    phoneVerificationToken: "pvt_test_valid_token",
  };

  try {
    await ordersService.createOrder(badCustomPayload, null);
    assert(false, "Should reject nonexistent customization");
  } catch (err: any) {
    assert(
      err.message.includes(
        'Customization "Fake Nonexistent Topping" is invalid',
      ),
      "Invalid customization rejected with 400 Bad Request",
    );
  }

  // TEST 5: Unavailable / Out of Stock Item Rejection
  console.log("\n--- TEST 5: Out of Stock / Unavailable Product Rejection ---");
  const outOfStockPayload: CreateOrderDto = {
    items: [
      {
        productId: "dish-out-of-stock",
        quantity: 1,
      },
    ],
    orderType: OrderType.TAKEAWAY,
    customerName: "Test User",
    customerPhone: "9816011111",
    phoneVerificationToken: "pvt_test_valid_token",
  };

  try {
    await ordersService.createOrder(outOfStockPayload, null);
    assert(false, "Should reject out of stock item");
  } catch (err: any) {
    assert(
      err.message.includes("is currently unavailable"),
      "Unavailable item rejected",
    );
  }

  // TEST 6: Invalid Nonexistent Product ID Rejection
  console.log("\n--- TEST 6: Nonexistent Product ID Rejection ---");
  const nonExistentPayload: CreateOrderDto = {
    items: [
      {
        productId: "dish-does-not-exist-999",
        quantity: 1,
      },
    ],
    orderType: OrderType.TAKEAWAY,
    customerName: "Test User",
    customerPhone: "9816011111",
    phoneVerificationToken: "pvt_test_valid_token",
  };

  try {
    await ordersService.createOrder(nonExistentPayload, null);
    assert(false, "Should reject nonexistent product ID");
  } catch (err: any) {
    assert(err.message.includes("was not found"), "Nonexistent item rejected");
  }

  // TEST 7: Delivery Address Requirement Enforcement
  console.log(
    "\n--- TEST 7: Delivery Address Validation for DELIVERY orders ---",
  );
  const missingAddressPayload: CreateOrderDto = {
    items: [
      {
        productId: "dish-dal-makhani",
        quantity: 1,
      },
    ],
    orderType: OrderType.DELIVERY,
    customerName: "Test User",
    customerPhone: "9816011111",
    phoneVerificationToken: "pvt_test_valid_token",
    // deliveryAddress missing
  };

  try {
    await ordersService.createOrder(missingAddressPayload, null);
    assert(false, "Should reject DELIVERY order without delivery address");
  } catch (err: any) {
    assert(
      err.message.includes("Delivery address is required"),
      "Missing address rejected",
    );
  }

  // TEST 8: Order Lookup by ID and Order Number
  console.log("\n--- TEST 8: Order Lookup by ID and Order Number ---");
  const lookupByNumber = await ordersService.getOrderByIdOrNumber(
    order1.orderNumber,
  );
  assert(lookupByNumber.id === order1.id, "Lookup by order number succeeds");

  const lookupById = await ordersService.getOrderByIdOrNumber(order1.id);
  assert(
    lookupById.orderNumber === order1.orderNumber,
    "Lookup by order ID succeeds",
  );

  // TEST 9: Authenticated User Order History
  console.log("\n--- TEST 9: User Order History Listing ---");
  const userOrdersResult: any = await ordersService.getUserOrders("user-gurpreet-123");
  const orderList = Array.isArray(userOrdersResult) ? userOrdersResult : userOrdersResult.items;
  assert(orderList.length === 1, "User order history contains 1 order");
  assert(
    orderList[0]?.orderNumber === order1.orderNumber,
    "Order history contains correct order number",
  );
  assert(orderList[0]?.itemCount === 3, "Total item quantity is 3");

  console.log(
    `\n🎉 ALL ${passedTests}/${totalTests} TESTS PASSED SUCCESSFULLY!`,
  );
}

runOrderVerificationTests().catch((err) => {
  console.error("Verification script execution failed:", err);
  process.exit(1);
});
