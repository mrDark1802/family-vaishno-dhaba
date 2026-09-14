export enum OrderStatus {
  PENDING = "PENDING",
  CONFIRMED = "CONFIRMED",
  PREPARING = "PREPARING",
  READY_FOR_PICKUP = "READY_FOR_PICKUP",
  OUT_FOR_DELIVERY = "OUT_FOR_DELIVERY",
  DELIVERED = "DELIVERED",
  CANCELLED = "CANCELLED",
}

export enum OrderType {
  DELIVERY = "DELIVERY",
  TAKEAWAY = "TAKEAWAY",
  DINE_IN = "DINE_IN",
}

export enum PaymentStatus {
  PENDING = "PENDING",
  COMPLETED = "COMPLETED",
  FAILED = "FAILED",
  REFUNDED = "REFUNDED",
}

export enum PaymentMethod {
  UPI = "UPI",
  CARD = "CARD",
  NETBANKING = "NETBANKING",
  CASH_ON_DELIVERY = "CASH_ON_DELIVERY",
}

export type PortionOption = "HALF" | "FULL";

export interface CreateOrderItemDto {
  productId: string;
  quantity: number;
  portion?: PortionOption;
  customization?: string;
  notes?: string;
}

export interface CreateOrderDto {
  items: CreateOrderItemDto[];
  orderType: OrderType;
  customerName: string;
  customerPhone: string;
  customerEmail?: string;
  deliveryAddress?: string;
  landmark?: string;
  city?: string;
  pincode?: string;
  notes?: string;
  paymentMethod?: PaymentMethod;
  couponCode?: string;
  phoneVerificationToken?: string;
}

export interface UpdateOrderStatusDto {
  status: OrderStatus;
  notes?: string;
}

export interface SendOtpDto {
  phone: string;
}

export interface VerifyOtpDto {
  phone: string;
  otp: string;
}

export interface OtpSendResponse {
  success: boolean;
  message: string;
  expiresInSeconds: number;
  resendCooldownSeconds: number;
  debugOtp?: string;
}

export interface OtpVerifyResponse {
  success: boolean;
  verified: boolean;
  phone: string;
  verificationToken: string;
  message?: string;
}

export interface OrderItemResponse {
  id: string;
  productId: string | null;
  productName: string;
  portion?: PortionOption | null;
  baseUnitPrice: number;
  customization?: string | null;
  customizationPrice: number;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  notes?: string | null;
}

export interface OrderResponse {
  id: string;
  orderNumber: string;
  userId: string | null;
  customerName: string;
  customerPhone: string;
  customerEmail?: string | null;
  deliveryAddress?: string | null;
  landmark?: string | null;
  city?: string | null;
  pincode?: string | null;
  status: OrderStatus;
  orderType: OrderType;
  paymentStatus: PaymentStatus;
  paymentMethod: PaymentMethod;
  subtotal: number;
  taxAmount: number;
  deliveryFee: number;
  discountAmount: number;
  totalAmount: number;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  items: OrderItemResponse[];
}

export interface OrderSummary {
  id: string;
  orderNumber: string;
  status: OrderStatus;
  orderType: OrderType;
  paymentStatus: PaymentStatus;
  totalAmount: number;
  itemCount: number;
  createdAt: string;
}

export interface PaginatedOrderResponse {
  items: OrderSummary[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
    hasNextPage: boolean;
  };
}

export interface OrderItemSnapshot {
  id: string;
  productId: string;
  name: string;
  unitPrice: number;
  quantity: number;
  subtotal: number;
  notes?: string | null;
}
