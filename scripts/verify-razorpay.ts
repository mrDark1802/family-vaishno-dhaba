import { RazorpayPaymentProvider } from "../apps/api/src/modules/payments/providers/razorpay-payment.provider";
import { PaymentsService } from "../apps/api/src/modules/payments/payments.service";
import {
  PaymentTransactionStatus,
  OrderStatus,
  PaymentStatus,
} from "@repo/types";
import { Prisma } from "@prisma/client";
import * as crypto from "crypto";

const TEST_KEY_ID = "rzp_test_TY1djpaL4Fhmjy";
const TEST_KEY_SECRET = "VDG0W9H8GIiqBElUFJRR9QLo";
const TEST_WEBHOOK_SECRET = "rzp_test_webhook_secret_fvd_2026";

class MockConfigService {
  private config: Record<string, any> = {
    "payments.keyId": TEST_KEY_ID,
    "payments.keySecret": TEST_KEY_SECRET,
    "payments.webhookSecret": TEST_WEBHOOK_SECRET,
    "payments.provider": "razorpay",
  };

  get<T>(key: string, defaultValue?: T): T {
    return this.config[key] !== undefined ? this.config[key] : defaultValue;
  }
}

class MockPrismaService {
  public orders: any[] = [];
  public payments: any[] = [];
  public auditLogs: any[] = [];

  public order = {
    findFirst: async ({ where }: any) => {
      if (where.OR) {
        return (
          this.orders.find((o) =>
            where.OR.some(
              (c: any) =>
                (c.id && o.id === c.id) ||
                (c.orderNumber && o.orderNumber === c.orderNumber),
            ),
          ) || null
        );
      }
      return null;
    },
    update: async ({ where, data }: any) => {
      const order = this.orders.find((o) => o.id === where.id);
      if (!order) throw new Error("Order not found");
      Object.assign(order, data, { updatedAt: new Date() });
      return { ...order };
    },
  };

  public payment = {
    findUnique: async ({ where }: any) => {
      const p = this.payments.find((pay) => pay.id === where.id);
      if (!p) return null;
      const order = this.orders.find((o) => o.id === p.orderId);
      return { ...p, order };
    },
    create: async ({ data }: any) => {
      const created = {
        id: `pay-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      this.payments.push(created);
      return { ...created };
    },
    update: async ({ where, data }: any) => {
      const payment = this.payments.find((p) => p.id === where.id);
      if (!payment) throw new Error("Payment not found");
      Object.assign(payment, data, { updatedAt: new Date() });
      return { ...payment };
    },
  };

  public auditLog = {
    create: async ({ data }: any) => {
      this.auditLogs.push({ id: `audit-${Date.now()}`, ...data });
      return { id: `audit-${Date.now()}` };
    },
  };

  public $transaction = async (cb: any) => {
    return cb(this);
  };
}

async function runRazorpayIntegrationTests() {
  console.log("==================================================================");
  console.log("💳 STARTING PRODUCTION RAZORPAY PAYMENT GATEWAY VERIFICATION SUITE");
  console.log("==================================================================\n");

  const configService = new MockConfigService();
  const razorpayProvider = new RazorpayPaymentProvider(configService as any);
  const mockPrisma = new MockPrismaService();
  const paymentsService = new PaymentsService(
    mockPrisma as any,
    razorpayProvider,
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

  // TEST 1: Provider Name & Credentials Initialization
  console.log("--- TEST 1: Provider Identity & Credentials Initialization ---");
  assert(razorpayProvider.name === "RAZORPAY", "Provider name is strictly RAZORPAY");

  // TEST 2: Cryptographic HMAC Signature Verification (Success Case)
  console.log("\n--- TEST 2: Valid HMAC-SHA256 Payment Signature Verification ---");
  const testOrderId = "order_O4v6Y8RzK1pNmQ";
  const testPaymentId = "pay_O4v7B9WzL2qOnR";
  
  // Compute valid signature according to Razorpay specification
  const validSignature = crypto
    .createHmac("sha256", TEST_KEY_SECRET)
    .update(`${testOrderId}|${testPaymentId}`)
    .digest("hex");

  const verifySuccessResult = await razorpayProvider.verifyPayment({
    paymentId: "pay-local-1",
    providerOrderId: testOrderId,
    providerPaymentId: testPaymentId,
    providerSignature: validSignature,
    payload: { amount: 540, currency: "INR" },
  });

  assert(verifySuccessResult.isVerified === true, "Valid HMAC signature passes verification");
  assert(verifySuccessResult.status === "SUCCEEDED", "Status is marked SUCCEEDED");
  assert(verifySuccessResult.providerPaymentId === testPaymentId, "Provider payment ID matches");

  // TEST 3: Cryptographic Signature Tampering Rejection
  console.log("\n--- TEST 3: Tampered Signature & Forgery Rejection ---");
  const tamperedSignature = validSignature.slice(0, -4) + "0000";

  const verifyTamperedResult = await razorpayProvider.verifyPayment({
    paymentId: "pay-local-1",
    providerOrderId: testOrderId,
    providerPaymentId: testPaymentId,
    providerSignature: tamperedSignature,
  });

  assert(verifyTamperedResult.isVerified === false, "Tampered signature fails verification");
  assert(verifyTamperedResult.status === "FAILED", "Status is marked FAILED on forgery");
  assert(verifyTamperedResult.errorMessage?.includes("Invalid payment signature") === true, "Descriptive security message returned");

  // TEST 4: Payment Failure / Bank Rejection Handling
  console.log("\n--- TEST 4: Bank Rejection & Declined Payment Handling ---");
  const verifyFailedResult = await razorpayProvider.verifyPayment({
    paymentId: "pay-local-1",
    providerOrderId: testOrderId,
    providerPaymentId: "pay_failed_declined",
    payload: {
      status: "FAILED",
      error: {
        code: "BAD_REQUEST_ERROR",
        description: "Payment failed due to insufficient funds in customer account.",
        source: "bank",
        step: "payment_authentication",
        reason: "payment_failed",
      },
    },
  });

  assert(verifyFailedResult.isVerified === false, "Declined payment is not verified");
  assert(verifyFailedResult.status === "FAILED", "Status is correctly marked FAILED");
  assert(verifyFailedResult.errorMessage?.includes("insufficient funds") === true, "Captures exact bank decline reason");

  // TEST 5: Razorpay Webhook HMAC Signature & Event Parsing
  console.log("\n--- TEST 5: Razorpay Webhook Verification & Event Dispatch ---");
  const webhookBody = JSON.stringify({
    event: "payment.captured",
    payload: {
      payment: {
        entity: {
          id: "pay_live_captured_123",
          order_id: "order_rzp_999",
          amount: 48000,
          currency: "INR",
          status: "captured",
          notes: {
            orderId: "ord-fvd-001",
          },
        },
      },
    },
  });

  const validWebhookSig = crypto
    .createHmac("sha256", TEST_WEBHOOK_SECRET)
    .update(webhookBody)
    .digest("hex");

  const webhookResult = await razorpayProvider.handleWebhook(webhookBody, {
    "x-razorpay-signature": validWebhookSig,
  });

  assert(webhookResult.signatureValid === true, "Webhook HMAC signature verified");
  assert(webhookResult.status === PaymentTransactionStatus.SUCCEEDED, "Captured event transitions to SUCCEEDED");
  assert(webhookResult.amount === 480, "Paise converted to rupees (48000 paise = ₹480)");
  assert(webhookResult.providerPaymentId === "pay_live_captured_123", "Extracts provider payment ID");

  // TEST 6: Invalid Webhook Signature Rejection
  console.log("\n--- TEST 6: Invalid Webhook Signature Rejection ---");
  const badWebhookResult = await razorpayProvider.handleWebhook(webhookBody, {
    "x-razorpay-signature": "forged_webhook_sig",
  });
  assert(badWebhookResult.signatureValid === false, "Forged webhook signature rejected");
  assert(badWebhookResult.status === PaymentTransactionStatus.FAILED, "Forged webhook returns FAILED");

  // TEST 7: End-to-End Server-Authoritative Verification with PaymentsService
  console.log("\n--- TEST 7: End-to-End Order Status Transition via PaymentsService ---");
  // Setup order in mock DB
  const testOrder = {
    id: "ord-dhaba-101",
    orderNumber: "FVD-20260904-9876",
    userId: "user-test-gurpreet",
    customerName: "Gurpreet Singh",
    customerPhone: "9816054321",
    totalAmount: new Prisma.Decimal(480),
    status: OrderStatus.PENDING,
    paymentStatus: PaymentStatus.PENDING,
    payments: [],
  };
  mockPrisma.orders.push(testOrder);

  // Create payment record
  const paymentRecord = await mockPrisma.payment.create({
    data: {
      orderId: testOrder.id,
      provider: "RAZORPAY",
      providerOrderId: testOrderId,
      amount: testOrder.totalAmount,
      currency: "INR",
      status: "CREATED",
    },
  });

  // Verify payment using valid signature
  const serverVerifyResponse = await paymentsService.verifyPayment(
    {
      paymentId: paymentRecord.id,
      providerOrderId: testOrderId,
      providerPaymentId: testPaymentId,
      providerSignature: validSignature,
    },
    "user-test-gurpreet",
  );

  assert(serverVerifyResponse.success === true, "PaymentsService verify returns success");
  assert(serverVerifyResponse.orderStatus === OrderStatus.CONFIRMED, "Order status transitioned to CONFIRMED");
  assert(serverVerifyResponse.paymentStatus === PaymentStatus.COMPLETED, "Payment status transitioned to COMPLETED");
  assert(testOrder.status === OrderStatus.CONFIRMED, "Database order marked CONFIRMED");
  assert(testOrder.paymentStatus === PaymentStatus.COMPLETED, "Database order marked COMPLETED");

  console.log("\n==================================================================");
  console.log(`🎉 ALL ${passedTests}/${totalTests} RAZORPAY TESTS PASSED WITH 100% SUCCESS!`);
  console.log("==================================================================");
}

runRazorpayIntegrationTests().catch((err) => {
  console.error("Razorpay test execution failed:", err);
  process.exit(1);
});
