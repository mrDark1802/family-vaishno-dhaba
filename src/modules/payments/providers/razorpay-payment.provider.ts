import { Injectable, Logger, BadRequestException } from "@nestjs/common";
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
import { PaymentTransactionStatus } from "../../../types";

@Injectable()
export class RazorpayPaymentProvider implements PaymentProvider {
  readonly name = "RAZORPAY";
  private readonly logger = new Logger(RazorpayPaymentProvider.name);
  private readonly keyId: string;
  private readonly keySecret: string;
  private readonly webhookSecret: string;
  private readonly baseUrl = "https://api.razorpay.com/v1";

  constructor(private readonly configService: ConfigService) {
    this.keyId = this.configService.get<string>(
      "payments.keyId",
      process.env.RAZORPAY_KEY_ID || "",
    );
    this.keySecret = this.configService.get<string>(
      "payments.keySecret",
      process.env.RAZORPAY_KEY_SECRET || "",
    );
    this.webhookSecret = this.configService.get<string>(
      "payments.webhookSecret",
      process.env.RAZORPAY_WEBHOOK_SECRET || "rzp_test_webhook_secret_fvd_2026",
    );

    if (!this.keyId || !this.keySecret) {
      this.logger.warn(
        "Razorpay API credentials missing. Ensure RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET are set.",
      );
    } else {
      this.logger.log(`Razorpay Payment Provider active with Key ID: ${this.keyId.slice(0, 10)}...`);
    }
  }

  /**
   * Helper to execute Basic Auth authenticated HTTP requests to Razorpay REST API
   */
  private async requestRazorpay(
    endpoint: string,
    method: "GET" | "POST",
    body?: Record<string, any>,
  ): Promise<any> {
    if (!this.keyId || !this.keySecret) {
      throw new BadRequestException(
        "Razorpay credentials are not configured on the server.",
      );
    }

    const authHeader = `Basic ${Buffer.from(`${this.keyId}:${this.keySecret}`).toString("base64")}`;
    const url = `${this.baseUrl}${endpoint}`;

    const headers: Record<string, string> = {
      Authorization: authHeader,
      "Content-Type": "application/json",
      Accept: "application/json",
    };

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: body ? JSON.stringify(body) : undefined,
      });

      const data = await res.json();

      if (!res.ok) {
        const errorDetail =
          data?.error?.description ||
          data?.error?.reason ||
          `Razorpay API request failed with status ${res.status}`;
        this.logger.error(`Razorpay API Error [${res.status}]: ${JSON.stringify(data)}`);
        throw new BadRequestException(`Payment gateway error: ${errorDetail}`);
      }

      return data;
    } catch (err: any) {
      if (err instanceof BadRequestException) throw err;
      this.logger.error(`Network communication error with Razorpay: ${err?.message}`);
      throw new BadRequestException(
        "Unable to connect to Razorpay payment gateway. Please check internet connection.",
      );
    }
  }

  /**
   * Create an authoritative order on Razorpay servers
   */
  async createPayment(
    params: CreatePaymentParams,
  ): Promise<PaymentCreationResult> {
    // Razorpay accepts amounts in paise (1 INR = 100 paise)
    const amountInPaise = Math.round(params.amount * 100);

    const payload = {
      amount: amountInPaise,
      currency: params.currency || "INR",
      receipt: params.orderNumber,
      notes: {
        orderId: params.orderId,
        orderNumber: params.orderNumber,
        customerName: params.customerName,
        customerPhone: params.customerPhone,
        customerEmail: params.customerEmail || "",
      },
    };

    this.logger.log(
      `Creating Razorpay order for Dhaba Order ${params.orderNumber} (₹${params.amount} / ${amountInPaise} paise)...`,
    );

    const rzpOrder = await this.requestRazorpay("/orders", "POST", payload);

    return {
      provider: this.name,
      providerOrderId: rzpOrder.id,
      status: "CREATED",
      metadata: {
        keyId: this.keyId,
        razorpayOrderId: rzpOrder.id,
        amountInPaise: rzpOrder.amount,
        currency: rzpOrder.currency,
        receipt: rzpOrder.receipt,
        status: rzpOrder.status,
      },
    };
  }

  /**
   * Cryptographically verify payment signatures returned from Razorpay Checkout modal
   */
  async verifyPayment(
    params: VerifyPaymentParams,
  ): Promise<PaymentVerificationResult> {
    this.logger.log(
      `Verifying Razorpay payment for transaction ${params.paymentId} (Order: ${params.providerOrderId}, Payment: ${params.providerPaymentId})`,
    );

    // 1. Check if client passed explicit failure information (e.g., payment rejected/cancelled)
    if (
      params.payload?.status === "FAILED" ||
      params.payload?.simulateFailure ||
      params.payload?.error
    ) {
      const errorMsg =
        params.payload?.error?.description ||
        params.payload?.errorMessage ||
        "Payment was declined or cancelled by the user.";
      return {
        isVerified: false,
        providerPaymentId: params.providerPaymentId || "unassigned",
        providerOrderId: params.providerOrderId,
        status: "FAILED",
        amount: params.payload?.amount || 0,
        currency: "INR",
        errorMessage: errorMsg,
      };
    }

    // 2. Validate essential signature components
    if (
      !params.providerOrderId ||
      !params.providerPaymentId ||
      !params.providerSignature
    ) {
      return {
        isVerified: false,
        providerPaymentId: params.providerPaymentId || "unknown",
        providerOrderId: params.providerOrderId,
        status: "FAILED",
        amount: params.payload?.amount || 0,
        currency: "INR",
        errorMessage:
          "Missing Razorpay payment signature or order ID in verification payload.",
      };
    }

    // 3. Compute expected HMAC-SHA256 signature
    // Formula: HMAC_SHA256(order_id + "|" + payment_id, secret)
    const signatureBody = `${params.providerOrderId}|${params.providerPaymentId}`;
    const expectedSignature = crypto
      .createHmac("sha256", this.keySecret)
      .update(signatureBody)
      .digest("hex");

    let isMatch = false;
    try {
      if (params.providerSignature.length === expectedSignature.length) {
        isMatch = crypto.timingSafeEqual(
          Buffer.from(params.providerSignature, "utf8"),
          Buffer.from(expectedSignature, "utf8"),
        );
      }
    } catch {
      isMatch = false;
    }

    if (!isMatch) {
      this.logger.warn(
        `[SECURITY WARNING] Razorpay signature mismatch for order ${params.providerOrderId}. Expected: ${expectedSignature}, Received: ${params.providerSignature}`,
      );
      return {
        isVerified: false,
        providerPaymentId: params.providerPaymentId,
        providerOrderId: params.providerOrderId,
        status: "FAILED",
        amount: params.payload?.amount || 0,
        currency: "INR",
        errorMessage:
          "Invalid payment signature. Verification failed with Razorpay.",
      };
    }

    this.logger.log(
      `Razorpay payment ${params.providerPaymentId} signature successfully verified!`,
    );

    return {
      isVerified: true,
      providerPaymentId: params.providerPaymentId,
      providerOrderId: params.providerOrderId,
      status: "SUCCEEDED",
      amount: params.payload?.amount || 0,
      currency: "INR",
      rawResponse: {
        verifiedAt: new Date().toISOString(),
        provider: this.name,
        providerOrderId: params.providerOrderId,
        providerPaymentId: params.providerPaymentId,
      },
    };
  }

  /**
   * Handle incoming Razorpay Webhook notifications
   */
  async handleWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookEventResult> {
    const signature =
      headers["x-razorpay-signature"] ||
      headers["x-webhook-signature"];

    const rawString =
      typeof rawBody === "string" ? rawBody : rawBody.toString("utf8");

    // Compute expected HMAC SHA-256 signature using Razorpay Webhook Secret
    const expectedSignature = crypto
      .createHmac("sha256", this.webhookSecret)
      .update(rawString)
      .digest("hex");

    let isSignatureValid = false;
    try {
      if (
        typeof signature === "string" &&
        signature.length === expectedSignature.length
      ) {
        isSignatureValid = crypto.timingSafeEqual(
          Buffer.from(signature, "utf8"),
          Buffer.from(expectedSignature, "utf8"),
        );
      }
    } catch {
      isSignatureValid = false;
    }

    if (!isSignatureValid) {
      this.logger.warn(
        `[SECURITY WARNING] Razorpay Webhook rejected: invalid x-razorpay-signature.`,
      );
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

    const eventType: string = parsed.event || "unknown";
    const paymentEntity = parsed.payload?.payment?.entity;
    const orderEntity = parsed.payload?.order?.entity;

    let status: PaymentTransactionStatus | "IGNORED" = "IGNORED";
    if (
      eventType === "payment.captured" ||
      eventType === "order.paid" ||
      eventType === "payment.authorized"
    ) {
      status = PaymentTransactionStatus.SUCCEEDED;
    } else if (eventType === "payment.failed") {
      status = PaymentTransactionStatus.FAILED;
    }

    const providerPaymentId = paymentEntity?.id;
    const providerOrderId = paymentEntity?.order_id || orderEntity?.id;
    const notes = paymentEntity?.notes || orderEntity?.notes || {};
    const amountInRupees = paymentEntity?.amount
      ? paymentEntity.amount / 100
      : undefined;

    return {
      eventType,
      providerPaymentId,
      providerOrderId,
      orderId: notes.orderId,
      amount: amountInRupees,
      currency: paymentEntity?.currency || "INR",
      status,
      signatureValid: true,
      metadata: {
        rawEvent: eventType,
        notes,
        paymentStatus: paymentEntity?.status,
      },
    };
  }
}
