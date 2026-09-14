import { Injectable, Logger } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import * as crypto from "crypto";
import {
  PaymentProvider,
  CreatePaymentParams,
  PaymentCreationResult,
  VerifyPaymentParams,
  PaymentVerificationResult,
  WebhookEventResult,
} from "./payment-provider.interface";
import { PaymentTransactionStatus } from "@repo/types";

@Injectable()
export class MockPaymentProvider implements PaymentProvider {
  readonly name = "MOCK";
  private readonly logger = new Logger(MockPaymentProvider.name);
  private readonly webhookSecret: string;

  constructor(private readonly configService: ConfigService) {
    this.webhookSecret = this.configService.get<string>(
      "payments.webhookSecret",
      "dev_mock_webhook_secret_fvd_2026",
    );
  }

  async createPayment(
    params: CreatePaymentParams,
  ): Promise<PaymentCreationResult> {
    const randomSuffix = crypto.randomBytes(6).toString("hex");
    const providerOrderId = `mock_ord_${params.orderNumber}_${randomSuffix}`;
    const providerPaymentId = `mock_pay_${randomSuffix}`;

    this.logger.log(
      `[MOCK PROVIDER] Initialized payment for order ${params.orderNumber} (₹${params.amount}): ${providerOrderId}`,
    );

    return {
      provider: this.name,
      providerPaymentId,
      providerOrderId,
      clientSecret: `mock_secret_${randomSuffix}`,
      checkoutUrl: `/payment/${params.orderNumber}?provider=mock`,
      status: "CREATED",
      metadata: {
        environment: "development_mock",
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        amount: params.amount,
        currency: params.currency,
      },
    };
  }

  async verifyPayment(
    params: VerifyPaymentParams,
  ): Promise<PaymentVerificationResult> {
    this.logger.log(
      `[MOCK PROVIDER] Verifying payment transaction ${params.paymentId}`,
    );

    // Simulate failure flag for testing
    if (
      params.payload?.simulateFailure ||
      params.providerSignature === "invalid_sig"
    ) {
      return {
        isVerified: false,
        providerPaymentId: params.providerPaymentId || "mock_pay_unknown",
        providerOrderId: params.providerOrderId,
        status: "FAILED",
        amount: params.payload?.amount || 0,
        currency: "INR",
        errorMessage:
          "Payment simulation was marked as failed or invalid signature.",
      };
    }

    const providerPaymentId =
      params.providerPaymentId ||
      `mock_pay_verified_${crypto.randomBytes(4).toString("hex")}`;

    return {
      isVerified: true,
      providerPaymentId,
      providerOrderId: params.providerOrderId,
      status: "SUCCEEDED",
      amount: params.payload?.amount || 0,
      currency: "INR",
      rawResponse: {
        verifiedAt: new Date().toISOString(),
        provider: this.name,
      },
    };
  }

  async handleWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookEventResult> {
    const signature =
      headers["x-mock-signature"] ||
      headers["x-payment-signature"] ||
      headers["x-webhook-signature"];

    const rawString =
      typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");

    // Compute expected HMAC SHA-256 signature
    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawString)
      .digest("hex");

    const isSignatureValid =
      typeof signature === "string" &&
      (signature === expectedSignature || signature === "mock_bypass_test_sig");

    if (!isSignatureValid) {
      this.logger.warn(`[MOCK PROVIDER] Webhook rejected: invalid signature.`);
      return {
        eventType: "unknown",
        status: PaymentTransactionStatus.FAILED,
        signatureValid: false,
      };
    }

    let parsed: any;
    try {
      parsed = JSON.parse(rawString);
    } catch {
      return {
        eventType: "invalid_json",
        status: PaymentTransactionStatus.FAILED,
        signatureValid: true,
      };
    }

    const eventType = parsed.event || parsed.type || "payment.succeeded";
    const paymentData = parsed.data || parsed.payload || parsed;

    let status: PaymentTransactionStatus | "IGNORED" = "IGNORED";
    if (eventType === "payment.succeeded" || eventType === "payment.captured") {
      status = PaymentTransactionStatus.SUCCEEDED;
    } else if (eventType === "payment.failed") {
      status = PaymentTransactionStatus.FAILED;
    }

    return {
      eventType,
      providerPaymentId: paymentData.providerPaymentId || paymentData.id,
      providerOrderId: paymentData.providerOrderId || paymentData.order_id,
      orderId: paymentData.orderId,
      amount: Number(paymentData.amount) || undefined,
      currency: paymentData.currency || "INR",
      status,
      signatureValid: true,
      metadata: paymentData.metadata,
    };
  }
}
