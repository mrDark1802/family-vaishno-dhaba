import { PaymentTransactionStatus, WebhookEventResult } from "../../../types";

export interface CreatePaymentParams {
  orderId: string;
  orderNumber: string;
  amount: number; // in INR rupees
  currency: string; // "INR"
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  metadata?: Record<string, any>;
}

export interface PaymentCreationResult {
  provider: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  clientSecret?: string;
  checkoutUrl?: string;
  status: "CREATED" | "PENDING";
  metadata?: Record<string, any>;
}

export interface VerifyPaymentParams {
  paymentId: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  providerSignature?: string;
  payload?: Record<string, any>;
}

export interface PaymentVerificationResult {
  isVerified: boolean;
  providerPaymentId: string;
  providerOrderId?: string;
  status: "SUCCEEDED" | "FAILED";
  amount: number;
  currency: string;
  errorMessage?: string;
  rawResponse?: Record<string, any>;
}

export { WebhookEventResult };

export const PAYMENT_PROVIDER = "PAYMENT_PROVIDER";

export interface PaymentProvider {
  readonly name: string;
  createPayment(params: CreatePaymentParams): Promise<PaymentCreationResult>;
  verifyPayment(
    params: VerifyPaymentParams,
  ): Promise<PaymentVerificationResult>;
  handleWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<WebhookEventResult>;
}
