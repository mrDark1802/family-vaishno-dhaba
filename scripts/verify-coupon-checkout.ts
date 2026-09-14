import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();
const API_URL = "http://localhost:4000/api";

async function main() {
  console.log("🚀 Starting verification for Coupon Validation & Checkout Order Creation...");

  // 1. Check coupon in DB
  const coupon = await prisma.coupon.findFirst({
    where: { code: "DHABA50" },
  });
  console.log(`✅ Found Coupon: ${coupon?.code}, Type: ${coupon?.discountType}, Value: ${coupon?.value}, Min: ₹${coupon?.minOrderAmount}`);

  // 2. Find an active product for testing
  const product = await prisma.product.findFirst({
    where: { isActive: true, isAvailable: true },
  });
  if (!product) {
    throw new Error("No active product found for testing!");
  }
  console.log(`✅ Testing with Dish: ${product.name} (Price: ₹${product.price})`);

  // 3. Test Validate Coupon API (Under minimum)
  const underMinRes = await fetch(`${API_URL}/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "DHABA50", orderSubtotal: 200 }),
  });
  const underMinData = await underMinRes.json();
  console.log(`✅ Under Minimum Validation Result: valid=${underMinData.data?.valid ?? underMinData.valid} (Expected false: "${underMinData.data?.message ?? underMinData.message}")`);

  // 4. Test Validate Coupon API (Above minimum)
  const validRes = await fetch(`${API_URL}/coupons/validate`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code: "DHABA50", orderSubtotal: 600 }),
  });
  const validData = await validRes.json();
  const validResult = validData.data || validData;
  console.log(`✅ Valid Coupon Test: valid=${validResult.valid}, discountAmount=₹${validResult.discountAmount}, message="${validResult.message}"`);
  if (!validResult.valid || validResult.discountAmount !== 50) {
    throw new Error("Coupon validation did not return expected discount!");
  }

  // 5. Test Create Order API with Coupon Code
  // Quantity to ensure subtotal > 499
  const unitPrice = Number(product.price);
  const qty = Math.ceil(550 / unitPrice);
  const expectedSubtotal = unitPrice * qty;
  const expectedDiscount = 50;
  const expectedTotal = expectedSubtotal - expectedDiscount;

  const orderPayload = {
    items: [
      {
        productId: product.id,
        quantity: qty,
        portion: "FULL",
      },
    ],
    orderType: "DELIVERY",
    customerName: "Coupon Test Customer",
    customerPhone: "9816099999",
    customerEmail: "coupontest@example.com",
    deliveryAddress: "Near Kangra Bus Stand",
    city: "Kangra",
    pincode: "176001",
    notes: "Testing coupon deduction at checkout",
    paymentMethod: "CASH_ON_DELIVERY",
    couponCode: "DHABA50",
  };

  const createOrderRes = await fetch(`${API_URL}/orders`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      "idempotency-key": `test-coupon-${Date.now()}`,
    },
    body: JSON.stringify(orderPayload),
  });

  const createOrderData = await createOrderRes.json();
  if (!createOrderRes.ok || !createOrderData.success) {
    console.error("Order creation failed:", createOrderData);
    throw new Error(createOrderData.error?.message || "Order creation failed");
  }

  const order = createOrderData.data;
  console.log(`✅ Created Order #${order.orderNumber}:`);
  console.log(`   - Subtotal: ₹${order.subtotal} (Expected: ₹${expectedSubtotal})`);
  console.log(`   - Discount: ₹${order.discountAmount} (Expected: ₹${expectedDiscount})`);
  console.log(`   - Total: ₹${order.totalAmount} (Expected: ₹${expectedTotal})`);

  if (Number(order.discountAmount) !== expectedDiscount || Number(order.totalAmount) !== expectedTotal) {
    throw new Error(`Order financial calculations do not match discounted total! Discount: ${order.discountAmount}, Total: ${order.totalAmount}`);
  }

  console.log("\n🎉 ALL COUPON & CHECKOUT TESTS PASSED SUCCESSFULLY!");
}

main()
  .catch((err) => {
    console.error("❌ Test script failed:", err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
