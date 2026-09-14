export enum PaymentTransactionStatus {
  CREATED = "CREATED",
  PENDING = "PENDING",
  SUCCEEDED = "SUCCEEDED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export interface PaymentResponse {
  id: string;
  orderId: string;
  orderNumber: string;
  provider: string;
  providerPaymentId: string | null;
  providerOrderId: string | null;
  amount: number;
  currency: string;
  status: PaymentTransactionStatus;
  errorMessage?: string | null;
  paidAt?: string | null;
  createdAt: string;
  updatedAt: string;
  // Provider-specific client tokens & config
  clientSecret?: string | null;
  checkoutUrl?: string | null;
  keyId?: string | null;
  metadata?: Record<string, any> | null;
}

export interface CreatePaymentDto {
  orderId: string;
}

export interface VerifyPaymentDto {
  paymentId: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  providerSignature?: string;
  payload?: Record<string, any>;
}

export interface PaymentVerificationResponse {
  success: boolean;
  payment: PaymentResponse;
  orderNumber: string;
  orderStatus: string;
  paymentStatus: string;
  message: string;
}

export interface WebhookEventResult {
  eventType: string;
  providerPaymentId?: string;
  providerOrderId?: string;
  status: PaymentTransactionStatus | "IGNORED";
  amount?: number;
  currency?: string;
  orderId?: string;
  signatureValid: boolean;
  metadata?: Record<string, any>;
}
