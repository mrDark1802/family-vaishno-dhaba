import "dotenv/config";
import { PrismaClient } from "@prisma/client";
import { CouponsService } from "../src/modules/coupons/coupons.service";
import { OrdersService } from "../src/modules/orders/orders.service";
import { VerificationService } from "../src/modules/verification/verification.service";
import { PrismaService } from "../src/database/prisma.service";
import { OrderType, PaymentMethod } from "../src/types";

async function runVerification() {
  console.log("🧪 Initializing Direct Services Verification...");

  const prisma = new PrismaService();
  await prisma.$connect();

  const mockConfigService = {
    get: (_key: string, defaultValue: string) => defaultValue,
  } as any;

  const couponsService = new CouponsService(prisma);
  const verificationService = new VerificationService(prisma, mockConfigService);
  const ordersService = new OrdersService(prisma, verificationService);

  try {
    // 1. Check coupon DHABA50
    const coupon = await prisma.coupon.findUnique({ where: { code: "DHABA50" } });
    console.log(`1. Active Coupon Check: ${coupon?.code} (Flat ₹${coupon?.value}, Min ₹${coupon?.minOrderAmount})`);
    if (!coupon) throw new Error("DHABA50 coupon missing in database!");

    // 2. Test under-minimum coupon validation
    const underMinResult = await couponsService.validateCoupon("DHABA50", 300);
    console.log(`2. Under-Minimum Validation (₹300): valid=${underMinResult.valid}, msg="${underMinResult.message}"`);
    if (underMinResult.valid) throw new Error("Coupon should NOT be valid under min order amount!");

    // 3. Test valid coupon validation
    const validResult = await couponsService.validateCoupon("DHABA50", 650);
    console.log(`3. Valid Coupon Validation (₹650): valid=${validResult.valid}, discount=₹${validResult.discountAmount}, msg="${validResult.message}"`);
    if (!validResult.valid || validResult.discountAmount !== 50) {
      throw new Error(`Expected ₹50 discount, got ₹${validResult.discountAmount}`);
    }

    // 4. Test Percentage Coupon (HIMACHAL15: 15% off up to max ₹150)
    const himachalResult = await couponsService.validateCoupon("HIMACHAL15", 1000);
    console.log(`4. Percentage Coupon Validation (15% of ₹1000): valid=${himachalResult.valid}, discount=₹${himachalResult.discountAmount}`);
    if (!himachalResult.valid || himachalResult.discountAmount !== 150) {
      throw new Error(`Expected ₹150 discount for 15% capped at 150, got ₹${himachalResult.discountAmount}`);
    }

    // 5. Test Product fetching for Order Placement
    const testDish = await prisma.product.findFirst({
      where: { isActive: true, isAvailable: true },
    });
    if (!testDish) throw new Error("No available product found!");

    const unitPrice = Number(testDish.price);
    const qty = Math.ceil(550 / unitPrice);
    const expectedSubtotal = unitPrice * qty;
    const expectedDiscount = 50;
    const expectedTotal = expectedSubtotal - expectedDiscount;

    console.log(`5. Creating Test Order with Dish "${testDish.name}" (Qty: ${qty}, Unit: ₹${unitPrice}, Subtotal: ₹${expectedSubtotal})`);

    const createdOrder = await ordersService.createOrder(
      {
        items: [
          {
            productId: testDish.id,
            quantity: qty,
            portion: "FULL",
          },
        ],
        orderType: OrderType.DELIVERY,
        customerName: "Integration Test User",
        customerPhone: "9816012345",
        customerEmail: "tester@dhaba.com",
        deliveryAddress: "Temple Road",
        city: "Kangra",
        pincode: "176001",
        notes: "Automated test with coupon",
        paymentMethod: PaymentMethod.CASH_ON_DELIVERY,
        couponCode: "DHABA50",
      },
      null,
      `direct-test-${Date.now()}`,
    );

    console.log(`6. Order Placed Successfully:`);
    console.log(`   - Order #: ${createdOrder.orderNumber}`);
    console.log(`   - Subtotal: ₹${createdOrder.subtotal} (Expected: ₹${expectedSubtotal})`);
    console.log(`   - Discount Amount: ₹${createdOrder.discountAmount} (Expected: ₹${expectedDiscount})`);
    console.log(`   - Total Payable: ₹${createdOrder.totalAmount} (Expected: ₹${expectedTotal})`);
    console.log(`   - Status: ${createdOrder.status}`);

    if (
      Number(createdOrder.discountAmount) !== expectedDiscount ||
      Number(createdOrder.totalAmount) !== expectedTotal
    ) {
      throw new Error("Order total or discount calculation mismatch!");
    }

    console.log("\n✨ ALL 6/6 UNIT & INTEGRATION TESTS PASSED WITH 100% ACCURACY!");
  } finally {
    await prisma.$disconnect();
  }
}

runVerification().catch((e) => {
  console.error("Test execution failed:", e);
  process.exit(1);
});
