import { PrismaClient, OrderStatus, RegionalCuisine } from "@prisma/client";

const prisma = new PrismaClient();

async function runVerification() {
  console.log("🚀 Starting Delete & Reject Functionality Verification...\n");

  let passed = 0;
  let failed = 0;

  function assert(condition: boolean, message: string) {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message}`);
      failed++;
    }
  }

  try {
    // 1. Verify Dish Creation and Deletion
    console.log("🔹 1. Testing Dish Creation & Permanent Deletion...");
    const testCategory = await prisma.category.findFirst();
    assert(!!testCategory, `Found category: ${testCategory?.name}`);

    const testDish = await prisma.product.create({
      data: {
        name: "Temporary Test Paneer Dish",
        slug: `temp-paneer-dish-${Date.now()}`,
        categoryId: testCategory!.id,
        price: 250,
        hasHalfOption: true,
        halfPrice: 140,
        cuisine: RegionalCuisine.PUNJABI,
        description: "Test dish for deletion verification",
      },
    });
    assert(!!testDish, `Created test dish "${testDish.name}" (ID: ${testDish.id})`);

    // Delete dish
    await prisma.product.delete({ where: { id: testDish.id } });
    const checkDeletedDish = await prisma.product.findUnique({ where: { id: testDish.id } });
    assert(checkDeletedDish === null, "Dish successfully deleted and no longer exists in database");

    // 2. Verify Coupon Creation, Toggle & Deletion
    console.log("\n🔹 2. Testing Coupon Management & Deletion...");
    const testCouponCode = `TESTPROMO${Date.now()}`;
    const testCoupon = await prisma.coupon.create({
      data: {
        code: testCouponCode,
        title: "Test 25% Off Promo",
        discountType: "PERCENT",
        value: 25,
        minOrderAmount: 400,
        maxDiscount: 100,
        isActive: true,
      },
    });
    assert(!!testCoupon, `Created test coupon "${testCoupon.code}" (ID: ${testCoupon.id})`);

    // Toggle coupon active state
    const toggledCoupon = await prisma.coupon.update({
      where: { id: testCoupon.id },
      data: { isActive: false },
    });
    assert(toggledCoupon.isActive === false, "Toggled coupon status to disabled (isActive: false)");

    // Delete coupon
    await prisma.coupon.delete({ where: { id: testCoupon.id } });
    const checkDeletedCoupon = await prisma.coupon.findUnique({ where: { id: testCoupon.id } });
    assert(checkDeletedCoupon === null, "Coupon successfully deleted and removed from database");

    // 3. Verify Category Creation & Deletion
    console.log("\n🔹 3. Testing Category Creation & Deletion...");
    const testCat = await prisma.category.create({
      data: {
        name: `Temp Seasonal Specials ${Date.now()}`,
        slug: `temp-seasonal-${Date.now()}`,
        icon: "🍂",
        displayOrder: 99,
      },
    });
    assert(!!testCat, `Created temporary category "${testCat.name}"`);

    await prisma.category.delete({ where: { id: testCat.id } });
    const checkDeletedCat = await prisma.category.findUnique({ where: { id: testCat.id } });
    assert(checkDeletedCat === null, "Category successfully deleted from database");

    // 4. Verify Order Rejection Workflow
    console.log("\n🔹 4. Testing Order Rejection / Cancellation Workflow...");
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: `FVD-REJECT-TEST-${Date.now()}`,
        customerName: "Rahul Sharma",
        customerPhone: "9816012345",
        deliveryAddress: "Near Main Bazaar, Kangra",
        city: "Kangra",
        pincode: "176001",
        status: OrderStatus.PENDING,
        subtotal: 260,
        totalAmount: 260,
        notes: null,
      },
    });
    assert(!!testOrder, `Created test pending order ${testOrder.orderNumber}`);

    // Reject order with custom reason
    const rejectionReason = "Rejected by Admin: Kitchen is overloaded with orders";
    const rejectedOrder = await prisma.order.update({
      where: { id: testOrder.id },
      data: {
        status: OrderStatus.CANCELLED,
        notes: rejectionReason,
      },
    });
    assert(rejectedOrder.status === OrderStatus.CANCELLED, "Order status advanced to 'CANCELLED'");
    assert(rejectedOrder.notes === rejectionReason, `Rejection reason stored: "${rejectedOrder.notes}"`);

    // Cleanup test order
    await prisma.order.delete({ where: { id: testOrder.id } });
    console.log("  🧹 Cleaned up temporary test order.");

    console.log(`\n========================================`);
    console.log(`✅ Verification Summary: ${passed} passed, ${failed} failed`);
    console.log(`========================================\n`);

    if (failed > 0) {
      process.exit(1);
    }
  } catch (err) {
    console.error("❌ Verification exception:", err);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

runVerification();
