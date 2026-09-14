import { PrismaClient, RegionalCuisine, PaymentMethod, OrderStatus, PaymentStatus } from "@prisma/client";
import { OrderType, CreateOrderDto } from "../src/types";
import { OrdersService } from "../src/modules/orders/orders.service";
import { MenuService } from "../src/modules/menu/menu.service";
import { PaymentsService } from "../src/modules/payments/payments.service";
import { RazorpayPaymentProvider } from "../src/modules/payments/providers/razorpay-payment.provider";
import { VerificationService } from "../src/modules/verification/verification.service";
import * as crypto from "crypto";

const prisma = new PrismaClient();

class MockConfigService {
  private config: Record<string, any> = {
    "payments.keyId": "rzp_test_TY1djpaL4Fhmjy",
    "payments.keySecret": "VDG0W9H8GIiqBElUFJRR9QLo",
    "payments.webhookSecret": "rzp_test_webhook_secret_fvd_2026",
    "payments.provider": "razorpay",
  };

  get<T>(key: string, defaultValue?: T): T {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }
}

async function runVerification() {
  console.log("🚀 Starting Dynamic Menu & Order Flow Verification...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, testName: string, detail?: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${testName}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${testName} ${detail ? `- ${detail}` : ""}`);
      failed++;
    }
  }

  try {
    const menuService = new MenuService(prisma as any);
    const mockConfig = new MockConfigService();
    const verificationService = new VerificationService(prisma as any, mockConfig as any);
    const razorpayProvider = new RazorpayPaymentProvider(mockConfig as any);
    const paymentsService = new PaymentsService(prisma as any, razorpayProvider);
    const ordersService = new OrdersService(prisma as any, verificationService);

    // Test 1: Category Listing
    console.log("1. Testing Category Service...");
    const categories = await menuService.getCategories();
    assert(categories.length >= 7, "Category count is 7 or more", `Got ${categories.length}`);
    assert(categories.some((c) => c.slug === "himachali-dham"), "Himachali Dham category exists");
    assert(categories.some((c) => c.slug === "punjabi-classics"), "Punjabi Classics category exists");
    assert(categories.some((c) => c.slug === "breads"), "Breads category exists");

    // Test 2: Dynamic Menu Items
    console.log("\n2. Testing Dynamic Menu Items Service...");
    const allDishes = await menuService.getMenuItems({});
    assert(allDishes.length >= 35, "Product count is 35 or more", `Got ${allDishes.length}`);

    // Test 3: Cuisine Filters
    const himachaliDishes = await menuService.getMenuItems({ cuisine: RegionalCuisine.HIMACHALI });
    assert(himachaliDishes.length >= 7, "Himachali cuisine filter works", `Got ${himachaliDishes.length}`);
    const punjabiDishes = await menuService.getMenuItems({ cuisine: RegionalCuisine.PUNJABI });
    assert(punjabiDishes.length >= 10, "Punjabi cuisine filter works", `Got ${punjabiDishes.length}`);

    // Test 4: Category Filtering
    const breads = await menuService.getMenuItems({ category: "breads" });
    assert(breads.length >= 7, "Breads category filter works", `Got ${breads.length}`);

    // Test 5: Search Filter
    const paneerDishes = await menuService.getMenuItems({ search: "paneer" });
    assert(paneerDishes.length >= 4, "Search for 'paneer' finds items", `Got ${paneerDishes.length}`);
    assert(paneerDishes.every((d) => d.name.toLowerCase().includes("paneer") || d.description?.toLowerCase().includes("paneer")), "All search results match 'paneer'");

    // Test 6: Single Item Lookup by ID and Slug
    console.log("\n3. Testing Single Item Lookup...");
    const sidduById = await menuService.getMenuItemById("dish-siddu-ghee");
    assert(sidduById.id === "dish-siddu-ghee", "Found dish by ID 'dish-siddu-ghee'");
    assert(Number(sidduById.price) === 180, "Siddu price is ₹180");

    const sidduBySlug = await menuService.getMenuItemById("himachali-siddu-ghee");
    assert(sidduBySlug.slug === "himachali-siddu-ghee", "Found dish by slug 'himachali-siddu-ghee'");

    // Test 7: Order Placement with newly seeded dishes
    console.log("\n4. Testing Order Placement with Seeded Dishes...");
    const orderDto = {
      items: [
        { productId: "dish-siddu-ghee", quantity: 2 },
        { productId: "dish-dal-makhani", quantity: 1 },
        { productId: "dish-amritsari-kulcha", quantity: 2 },
        { productId: "dish-mittha-bhat", quantity: 1 },
      ],
      orderType: OrderType.DELIVERY,
      customerName: "Mohinder Singh",
      customerPhone: "9816012345",
      customerEmail: "mohinder@example.com",
      deliveryAddress: "Near Tea Gardens, Main Kangra Road",
      city: "Kangra",
      pincode: "176001",
      notes: "Please deliver hot in insulated box",
    };

    // Expected Subtotal: 2*180 (360) + 1*260 (260) + 2*130 (260) + 1*150 (150) = 1030
    const createdOrder = await ordersService.createOrder(orderDto, null, `idempotency-test-${Date.now()}`);
    assert(Boolean(createdOrder.id), "Order successfully placed in database");
    assert(Number(createdOrder.subtotal) === 1030, "Server-authoritative subtotal is ₹1030", `Got ${createdOrder.subtotal}`);
    assert(createdOrder.status === OrderStatus.PENDING, "Order status starts as PENDING");
    assert(createdOrder.items.length === 4, "Order contains 4 line items");

    // Test 8: Payment Initialization for the placed order
    console.log("\n5. Testing Payment Session Creation...");
    const payment = await paymentsService.createPayment({ orderId: createdOrder.id });
    assert(Boolean(payment.id), "Payment record created in database");
    assert(Math.abs(Number(payment.amount) - Number(createdOrder.totalAmount)) < 0.01, "Payment amount matches order total", `Payment: ₹${payment.amount}, Order: ₹${createdOrder.totalAmount}`);
    assert(payment.status === "CREATED", "Payment transaction status is CREATED");
    assert(payment.keyId === "rzp_test_TY1djpaL4Fhmjy", "Correct Razorpay test Key ID returned");

    // Test 9: Payment Verification Simulation
    console.log("\n6. Testing Cryptographic Payment Verification...");
    const testPaymentId = "pay_test_order_flow_12345";
    const providerOrderId = payment.providerOrderId || "order_mock_test_12345";
    const hmacData = `${providerOrderId}|${testPaymentId}`;
    const testSignature = crypto
      .createHmac("sha256", "VDG0W9H8GIiqBElUFJRR9QLo")
      .update(hmacData)
      .digest("hex");

    const verifyResult = await paymentsService.verifyPayment({
      paymentId: payment.id,
      providerPaymentId: testPaymentId,
      providerOrderId: providerOrderId,
      providerSignature: testSignature,
      payload: { amount: payment.amount, currency: payment.currency },
    });

    assert(verifyResult.success === true, "Cryptographic payment verification succeeded");
    assert(verifyResult.payment.status === "SUCCEEDED", "Payment transaction marked as SUCCEEDED");

    // Verify order was advanced to CONFIRMED
    const updatedOrder = await prisma.order.findUnique({ where: { id: createdOrder.id } });
    assert(updatedOrder?.status === OrderStatus.CONFIRMED, "Order advanced to CONFIRMED status");
    assert(updatedOrder?.paymentStatus === PaymentStatus.COMPLETED, "Order paymentStatus updated to COMPLETED");

    // Cleanup test order
    await prisma.order.delete({ where: { id: createdOrder.id } });
    console.log("\n🧹 Cleaned up temporary test order.");

  } catch (err: any) {
    console.error("❌ Exception during test:", err);
    failed++;
  } finally {
    await prisma.$disconnect();
  }

  console.log(`\n========================================`);
  console.log(`Test Results: ${passed} Passed, ${failed} Failed`);
  console.log(`========================================\n`);

  if (failed > 0) {
    process.exit(1);
  }
}

runVerification();
