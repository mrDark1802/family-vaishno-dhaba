import { VerificationService } from "../src/modules/verification/verification.service";
import { OrdersService } from "../src/modules/orders/orders.service";
import { CreateOrderDto } from "../src/modules/orders/dto/create-order.dto";
import { OrderType, PaymentMethod, OrderStatus, PaymentStatus } from "../src/types";
import { Prisma } from "@prisma/client";

// Mock Config Service
class MockConfigService {
  get(key: string, defaultValue?: any) {
    if (key === "jwt.secret") return "test_verification_secret_key_123456";
    return defaultValue;
  }
}

// In-Memory Mock Database for Verification and Orders
class MockPrismaService {
  public phoneVerifications: any[] = [];
  public products: any[] = [
    {
      id: "dish-dal-makhani",
      name: "Slow Cooked Dal Makhani",
      slug: "dal-makhani",
      price: new Prisma.Decimal(240),
      isActive: true,
      isAvailable: true,
      customizationOptions: null,
    },
  ];
  public orders: any[] = [];
  public orderItems: any[] = [];

  public phoneVerification = {
    findFirst: async ({ where, orderBy }: any) => {
      let matches = this.phoneVerifications.filter((pv) => {
        if (where.phone && pv.phone !== where.phone) return false;
        if (where.consumedAt === null && pv.consumedAt !== null) return false;
        return true;
      });
      if (orderBy?.createdAt === "desc") {
        matches.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      }
      return matches[0] || null;
    },
    findUnique: async ({ where }: any) => {
      if (where.tokenHash) {
        return this.phoneVerifications.find((pv) => pv.tokenHash === where.tokenHash) || null;
      }
      if (where.id) {
        return this.phoneVerifications.find((pv) => pv.id === where.id) || null;
      }
      return null;
    },
    count: async ({ where }: any) => {
      return this.phoneVerifications.filter((pv) => {
        if (where.phone && pv.phone !== where.phone) return false;
        if (where.createdAt?.gte && pv.createdAt < where.createdAt.gte) return false;
        return true;
      }).length;
    },
    create: async ({ data }: any) => {
      const record = {
        id: `pv-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        phone: data.phone,
        otpHash: data.otpHash,
        tokenHash: data.tokenHash || null,
        attempts: data.attempts || 0,
        verifiedAt: data.verifiedAt || null,
        consumedAt: data.consumedAt || null,
        expiresAt: data.expiresAt,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.phoneVerifications.push(record);
      return record;
    },
    update: async ({ where, data }: any) => {
      const idx = this.phoneVerifications.findIndex((pv) => pv.id === where.id);
      if (idx === -1) throw new Error("Record not found for update");
      const updated = {
        ...this.phoneVerifications[idx],
        ...data,
        updatedAt: new Date(),
      };
      this.phoneVerifications[idx] = updated;
      return updated;
    },
  };

  public product = {
    findMany: async ({ where }: any) => {
      const ids: string[] = where?.id?.in || [];
      return this.products.filter((p) => ids.includes(p.id));
    },
  };

  public order = {
    findFirst: async () => null,
    findUnique: async ({ where }: any) => {
      if (where.id) return this.orders.find((o) => o.id === where.id) || null;
      if (where.orderNumber) return this.orders.find((o) => o.orderNumber === where.orderNumber) || null;
      return null;
    },
    create: async ({ data }: any) => {
      const order = {
        id: `order-${Date.now()}`,
        orderNumber: data.orderNumber,
        userId: data.userId || null,
        customerName: data.customerName,
        customerPhone: data.customerPhone,
        customerEmail: data.customerEmail || null,
        deliveryAddress: data.deliveryAddress || null,
        landmark: data.landmark || null,
        city: data.city || null,
        pincode: data.pincode || null,
        notes: data.notes || null,
        status: data.status || OrderStatus.PENDING,
        orderType: data.orderType,
        paymentStatus: data.paymentStatus || PaymentStatus.PENDING,
        paymentMethod: data.paymentMethod || PaymentMethod.UPI,
        subtotal: data.subtotal,
        taxAmount: data.taxAmount,
        deliveryFee: data.deliveryFee,
        discountAmount: data.discountAmount,
        totalAmount: data.totalAmount,
        createdAt: new Date(),
        updatedAt: new Date(),
        items: [],
      };
      this.orders.push(order);
      return order;
    },
  };

  public orderItem = {
    createMany: async ({ data }: any) => {
      data.forEach((item: any) => {
        this.orderItems.push({
          id: `item-${Date.now()}-${Math.random()}`,
          ...item,
        });
      });
      return { count: data.length };
    },
  };

  public $transaction = async (cb: any) => {
    return cb(this);
  };
}

async function runPhoneVerificationTestSuite() {
  console.log("===============================================================");
  console.log("🚀 STARTING PHONE OTP VERIFICATION & CHECKOUT INTEGRATION TESTS");
  console.log("===============================================================\n");

  const mockPrisma = new MockPrismaService();
  const mockConfig = new MockConfigService();
  const verificationService = new VerificationService(
    mockPrisma as any,
    mockConfig as any,
  );
  const ordersService = new OrdersService(
    mockPrisma as any,
    verificationService,
  );

  let passedTests = 0;
  let totalTests = 0;

  function assert(condition: boolean, message: string) {
    totalTests++;
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passedTests++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      throw new Error(`Assertion failed: ${message}`);
    }
  }

  // TEST 1: Phone Normalization
  console.log("--- TEST 1: Phone Number Normalization ---");
  assert(verificationService.normalizePhone("+919816054321") === "9816054321", "Normalizes +91 prefix");
  assert(verificationService.normalizePhone("+91 98160 54321") === "9816054321", "Normalizes spaces");
  assert(verificationService.normalizePhone("919816054321") === "9816054321", "Normalizes 91 prefix");
  assert(verificationService.normalizePhone("9816054321") === "9816054321", "Normalizes 10-digit number");

  // TEST 2: Send OTP
  console.log("\n--- TEST 2: Send OTP Generation ---");
  const sendRes = await verificationService.sendOtp("+91 98160 54321");
  assert(sendRes.success === true, "Send OTP returns success");
  assert(sendRes.resendCooldownSeconds === 60, "Resend cooldown is 60 seconds");
  assert(sendRes.expiresInSeconds === 300, "OTP expiry is 5 minutes");
  assert(typeof sendRes.debugOtp === "string" && sendRes.debugOtp.length === 6, "Generates 6-digit OTP code");
  const testOtp = sendRes.debugOtp!;

  // TEST 3: 60-Second Cooldown Enforcement
  console.log("\n--- TEST 3: Resend Cooldown Enforcement (<60s) ---");
  try {
    await verificationService.sendOtp("9816054321");
    assert(false, "Should throw TOO_MANY_REQUESTS when requesting OTP again immediately");
  } catch (err: any) {
    assert(err.message.includes("Please wait"), "Rate limit cooldown active");
  }

  // TEST 4: Incorrect OTP & Brute-Force Protection (Max 3 Attempts)
  console.log("\n--- TEST 4: Invalid OTP & Brute-force lockout ---");
  try {
    await verificationService.verifyOtp("9816054321", "000000");
    assert(false, "Should reject incorrect OTP");
  } catch (err: any) {
    assert(err.message.includes("2 attempts remaining"), "First bad attempt leaves 2 attempts remaining");
  }

  try {
    await verificationService.verifyOtp("9816054321", "111111");
    assert(false, "Should reject incorrect OTP");
  } catch (err: any) {
    assert(err.message.includes("1 attempt remaining"), "Second bad attempt leaves 1 attempt remaining");
  }

  try {
    await verificationService.verifyOtp("9816054321", "222222");
    assert(false, "Should reject incorrect OTP on 3rd attempt");
  } catch (err: any) {
    assert(err.message.includes("Maximum attempts reached"), "Third bad attempt locks out code");
  }

  // Attempting even the right OTP now should be locked out
  try {
    await verificationService.verifyOtp("9816054321", testOtp);
    assert(false, "Locked out record cannot be verified with valid OTP");
  } catch (err: any) {
    assert(err.message.includes("Too many incorrect attempts") || err.message.includes("Maximum attempts reached"), "Locked out message returned");
  }

  // TEST 5: Successful OTP Verification & Token Issuance
  console.log("\n--- TEST 5: Valid OTP Verification & Token Generation ---");
  // Fast forward cooldown in memory
  mockPrisma.phoneVerifications[0].createdAt = new Date(Date.now() - 65 * 1000);
  const newSend = await verificationService.sendOtp("9816054321");
  const validOtp = newSend.debugOtp!;

  const verifyRes = await verificationService.verifyOtp("9816054321", validOtp);
  assert(verifyRes.success === true && verifyRes.verified === true, "OTP verification succeeds");
  assert(verifyRes.phone === "9816054321", "Verified phone is normalized");
  assert(verifyRes.verificationToken.startsWith("pvt_"), "Issues opaque pvt_ verification token");
  const validToken = verifyRes.verificationToken;

  // TEST 6: Order Creation without Verification Token (MUST BE REJECTED)
  console.log("\n--- TEST 6: Order Placement Without Verification Token ---");
  const unverifiedOrderPayload: CreateOrderDto = {
    items: [{ productId: "dish-dal-makhani", quantity: 1 }],
    orderType: OrderType.TAKEAWAY,
    customerName: "Gurpreet Singh",
    customerPhone: "9816054321",
    // phoneVerificationToken missing
  };

  try {
    await ordersService.createOrder(unverifiedOrderPayload, null);
    assert(false, "Should reject order creation without phone verification token");
  } catch (err: any) {
    assert(err.message.includes("Mobile number verification is required"), "Unverified order rejected by backend");
  }

  // TEST 7: Order Creation with Phone Number Mismatch (MUST BE REJECTED)
  console.log("\n--- TEST 7: Order Placement With Phone Number Mismatch ---");
  const mismatchedOrderPayload: CreateOrderDto = {
    items: [{ productId: "dish-dal-makhani", quantity: 1 }],
    orderType: OrderType.TAKEAWAY,
    customerName: "Gurpreet Singh",
    customerPhone: "9876543210", // Different phone from token!
    phoneVerificationToken: validToken,
  };

  try {
    await ordersService.createOrder(mismatchedOrderPayload, null);
    assert(false, "Should reject order with mismatched verified phone number");
  } catch (err: any) {
    assert(err.message.includes("Mobile verification mismatch"), "Mismatched phone number rejected");
  }

  // TEST 8: Order Creation with Valid Verification Token (MUST SUCCEED)
  console.log("\n--- TEST 8: Order Placement With Valid Verification Token ---");
  const validOrderPayload: CreateOrderDto = {
    items: [{ productId: "dish-dal-makhani", quantity: 2 }],
    orderType: OrderType.TAKEAWAY,
    customerName: "Gurpreet Singh",
    customerPhone: "9816054321",
    phoneVerificationToken: validToken,
  };

  const createdOrder = await ordersService.createOrder(validOrderPayload, null);
  assert(createdOrder !== null, "Order created successfully");
  assert(createdOrder.customerPhone === "9816054321", "Order has verified customer phone");
  assert(createdOrder.subtotal === 480, "Authoritative pricing calculated correctly (2 * 240)");

  // TEST 9: Token Replay Attack (Already Consumed Token MUST BE REJECTED)
  console.log("\n--- TEST 9: Replay Attack (Reusing Consumed Token) ---");
  const replayOrderPayload: CreateOrderDto = {
    items: [{ productId: "dish-dal-makhani", quantity: 1 }],
    orderType: OrderType.TAKEAWAY,
    customerName: "Gurpreet Singh",
    customerPhone: "9816054321",
    phoneVerificationToken: validToken, // Same token reused!
  };

  try {
    await ordersService.createOrder(replayOrderPayload, null);
    assert(false, "Should reject replay of already consumed token");
  } catch (err: any) {
    assert(err.message.includes("already been used"), "Reused verification token rejected");
  }

  console.log(`\n===============================================================`);
  console.log(`🎉 ALL ${passedTests}/${totalTests} TESTS PASSED WITH 100% SUCCESS!`);
  console.log(`===============================================================`);
}

runPhoneVerificationTestSuite().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});
