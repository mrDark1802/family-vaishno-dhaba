import { PrismaClient, UserRole, OrderStatus } from "@prisma/client";
import * as argon2 from "argon2";

const prisma = new PrismaClient();

async function runVerification() {
  console.log("🚀 Starting Dynamic Admin Panel & Portion Pricing Verification...\n");

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
    // 1. Verify Admin User in Database
    console.log("🔹 1. Verifying Seeded Admin Credentials in PostgreSQL...");
    const adminUser = await prisma.user.findUnique({
      where: { email: "fvd@admin.com" },
    });

    assert(!!adminUser, "Admin account with email 'fvd@admin.com' exists");
    assert(adminUser?.role === UserRole.ADMIN, `Admin user has role 'ADMIN' (found: ${adminUser?.role})`);
    
    const isPasswordValid = adminUser?.passwordHash
      ? await argon2.verify(adminUser.passwordHash, "fvd@123")
      : false;
    assert(isPasswordValid, "Password 'fvd@123' verifies against Argon2id hash");

    // 2. Verify Portion Pricing in Products Catalog
    console.log("\n🔹 2. Verifying Portion (Half / Full) Pricing in Database Catalog...");
    const dishesWithHalf = await prisma.product.findMany({
      where: { hasHalfOption: true },
    });

    assert(dishesWithHalf.length >= 10, `Found ${dishesWithHalf.length} dishes with Half portion pricing option enabled`);

    const dalMakhani = await prisma.product.findFirst({
      where: { slug: "dhaba-dal-makhani" },
    });
    assert(!!dalMakhani, "Found 'Slow-Cooked Dhaba Dal Makhani'");
    assert(dalMakhani?.hasHalfOption === true, "Dal Makhani has 'hasHalfOption: true'");
    assert(Number(dalMakhani?.price) === 260, `Dal Makhani Full Price is ₹260 (found: ₹${dalMakhani?.price})`);
    assert(Number(dalMakhani?.halfPrice) === 150, `Dal Makhani Half Price is ₹150 (found: ₹${dalMakhani?.halfPrice})`);

    const siddu = await prisma.product.findFirst({
      where: { slug: "himachali-siddu-ghee" },
    });
    assert(!!siddu, "Found 'Himachali Siddu with Pure Desi Ghee'");
    assert(siddu?.hasHalfOption === false, "Siddu is full bread only (hasHalfOption: false)");

    // 3. Test Order Creation with Portion Sizing (Half and Full in same order)
    console.log("\n🔹 3. Testing Order Placement with Half & Full Portions...");
    const testOrderNumber = `FVD-TEST-${Date.now()}`;
    const testOrder = await prisma.order.create({
      data: {
        orderNumber: testOrderNumber,
        customerName: "Gurpreet Singh",
        customerPhone: "9816099999",
        customerEmail: "gurpreet@example.com",
        deliveryAddress: "Near Tea Gardens, Palampur Road",
        city: "Kangra",
        pincode: "176001",
        status: OrderStatus.PENDING,
        subtotal: 410, // 150 (Half Dal) + 260 (Full Dal)
        totalAmount: 410,
        items: {
          create: [
            {
              productId: dalMakhani!.id,
              productName: dalMakhani!.name,
              portion: "HALF",
              baseUnitPrice: 150,
              unitPrice: 150,
              quantity: 1,
              subtotal: 150,
            },
            {
              productId: dalMakhani!.id,
              productName: dalMakhani!.name,
              portion: "FULL",
              baseUnitPrice: 260,
              unitPrice: 260,
              quantity: 1,
              subtotal: 260,
            },
          ],
        },
      },
      include: { items: true },
    });

    assert(!!testOrder, `Order ${testOrder.orderNumber} created with 2 line items`);
    assert(testOrder.items.length === 2, `Order contains 2 items`);
    assert(testOrder.items[0]?.portion === "HALF", `Item 1 portion stored as 'HALF' with subtotal ₹${testOrder.items[0]?.subtotal}`);
    assert(testOrder.items[1]?.portion === "FULL", `Item 2 portion stored as 'FULL' with subtotal ₹${testOrder.items[1]?.subtotal}`);
    assert(Number(testOrder.totalAmount) === 410, `Total amount ₹${testOrder.totalAmount} matches combined Half + Full prices`);

    // 4. Test Admin Status Transition Workflow
    console.log("\n🔹 4. Testing Admin Order Status Transition Workflow...");
    const updatedToPreparing = await prisma.order.update({
      where: { id: testOrder.id },
      data: { status: OrderStatus.PREPARING },
    });
    assert(updatedToPreparing.status === OrderStatus.PREPARING, "Order advanced to 'PREPARING'");

    const updatedToDelivered = await prisma.order.update({
      where: { id: testOrder.id },
      data: { status: OrderStatus.DELIVERED },
    });
    assert(updatedToDelivered.status === OrderStatus.DELIVERED, "Order advanced to 'DELIVERED'");

    // Cleanup test order
    await prisma.orderItem.deleteMany({ where: { orderId: testOrder.id } });
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
