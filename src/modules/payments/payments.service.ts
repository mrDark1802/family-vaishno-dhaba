import {
  Injectable,
  Inject,
  NotFoundException,
  BadRequestException,
  UnauthorizedException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import {
  Prisma,
  PaymentTransactionStatus as PrismaPaymentStatus,
  PaymentStatus as PrismaOrderPaymentStatus,
  OrderStatus as PrismaOrderStatus,
} from "@prisma/client";
import {
  PAYMENT_PROVIDER,
  PaymentProvider,
} from "./providers/payment-provider.interface";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { VerifyPaymentDto } from "./dto/verify-payment.dto";
import {
  PaymentResponse,
  PaymentVerificationResponse,
  WebhookEventResult,
  PaymentTransactionStatus,
} from "../../types";

@Injectable()
export class PaymentsService {
  private readonly logger = new Logger(PaymentsService.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(PAYMENT_PROVIDER)
    private readonly paymentProvider: PaymentProvider,
  ) {}

  /**
   * Create or retrieve an active payment attempt for an order.
   * Server-authoritative amount, currency, and strict customer authorization.
   */
  async createPayment(
    dto: CreatePaymentDto,
    userId: string | null = null,
    _idempotencyKey?: string,
  ): Promise<PaymentResponse> {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: dto.orderId }, { orderNumber: dto.orderId }],
      },
      include: {
        items: true,
        payments: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found or unauthorized access.");
    }

    // 1. Strict Customer Authorization: If order belongs to a user, caller must match
    if (order.userId && order.userId !== userId) {
      throw new NotFoundException("Order not found or unauthorized access.");
    }

    // 2. Payment Eligibility Checks
    if (order.paymentStatus === PrismaOrderPaymentStatus.COMPLETED) {
      throw new BadRequestException(
        `Order ${order.orderNumber} has already been paid and completed.`,
      );
    }

    if (order.status === PrismaOrderStatus.CANCELLED) {
      throw new BadRequestException(
        `Order ${order.orderNumber} is cancelled and cannot be paid.`,
      );
    }

    // 3. Payment Creation Idempotency: Return existing active payment attempt if available
    const existingActivePayment = order.payments.find(
      (p) =>
        p.status === PrismaPaymentStatus.CREATED ||
        p.status === PrismaPaymentStatus.PENDING,
    );

    if (existingActivePayment) {
      this.logger.log(
        `Reusing existing active payment transaction ${existingActivePayment.id} for order ${order.orderNumber}`,
      );
      return this.mapPaymentToResponse(
        existingActivePayment,
        order.orderNumber,
      );
    }

    // 4. Authoritative Amount and Currency from PostgreSQL
    const totalAmount = Number(order.totalAmount);
    const currency = "INR";

    if (totalAmount <= 0) {
      throw new BadRequestException("Invalid order amount for payment.");
    }

    // 5. Initialize payment with provider abstraction
    const providerResult = await this.paymentProvider.createPayment({
      orderId: order.id,
      orderNumber: order.orderNumber,
      amount: totalAmount,
      currency,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail,
      metadata: {
        orderType: order.orderType,
        orderId: order.id,
      },
    });

    // 6. Record Payment record in database
    const payment = await this.prisma.payment.create({
      data: {
        orderId: order.id,
        provider: this.paymentProvider.name,
        providerPaymentId: providerResult.providerPaymentId || null,
        providerOrderId: providerResult.providerOrderId || null,
        amount: new Prisma.Decimal(totalAmount),
        currency,
        status:
          providerResult.status === "PENDING"
            ? PrismaPaymentStatus.PENDING
            : PrismaPaymentStatus.CREATED,
        metadata:
          (providerResult.metadata as Prisma.InputJsonValue) || Prisma.JsonNull,
      },
    });

    this.logger.log(
      `Payment transaction ${payment.id} created for order ${order.orderNumber} (₹${totalAmount}) via ${this.paymentProvider.name}`,
    );

    return this.mapPaymentToResponse(payment, order.orderNumber, {
      keyId: providerResult.metadata?.keyId,
      clientSecret: providerResult.clientSecret,
      checkoutUrl: providerResult.checkoutUrl,
    });
  }

  /**
   * Server-side payment verification.
   * Atomically transitions payment and order status on success.
   */
  async verifyPayment(
    dto: VerifyPaymentDto,
    userId: string | null = null,
  ): Promise<PaymentVerificationResponse> {
    const payment = await this.prisma.payment.findUnique({
      where: { id: dto.paymentId },
      include: { order: true },
    });

    if (!payment || !payment.order) {
      throw new NotFoundException("Payment transaction not found.");
    }

    // Customer authorization check
    if (payment.order.userId && payment.order.userId !== userId) {
      throw new NotFoundException("Payment transaction not found.");
    }

    // If already verified and succeeded, return idempotent success
    if (
      payment.status === PrismaPaymentStatus.SUCCEEDED &&
      payment.order.paymentStatus === PrismaOrderPaymentStatus.COMPLETED
    ) {
      return {
        success: true,
        payment: this.mapPaymentToResponse(payment, payment.order.orderNumber),
        orderNumber: payment.order.orderNumber,
        orderStatus: payment.order.status,
        paymentStatus: payment.order.paymentStatus,
        message: "Payment has already been verified and completed.",
      };
    }

    // Verify through the provider abstraction
    const verificationResult = await this.paymentProvider.verifyPayment({
      paymentId: payment.id,
      providerPaymentId:
        dto.providerPaymentId || payment.providerPaymentId || undefined,
      providerOrderId:
        dto.providerOrderId || payment.providerOrderId || undefined,
      providerSignature: dto.providerSignature,
      payload: {
        ...dto.payload,
        amount: Number(payment.amount),
        currency: payment.currency,
      },
    });

    if (
      verificationResult.isVerified &&
      verificationResult.status === "SUCCEEDED"
    ) {
      // Atomic Transaction: Payment SUCCEEDED + Order COMPLETED & CONFIRMED
      const { updatedPayment, updatedOrder } = await this.prisma.$transaction(
        async (tx) => {
          const upPay = await tx.payment.update({
            where: { id: payment.id },
            data: {
              status: PrismaPaymentStatus.SUCCEEDED,
              providerPaymentId:
                verificationResult.providerPaymentId ||
                payment.providerPaymentId,
              paidAt: new Date(),
              metadata: {
                ...(typeof payment.metadata === "object" &&
                payment.metadata !== null
                  ? (payment.metadata as Record<string, any>)
                  : {}),
                verification: verificationResult.rawResponse || {},
              } as Prisma.InputJsonValue,
            },
          });

          const upOrd = await tx.order.update({
            where: { id: payment.orderId },
            data: {
              paymentStatus: PrismaOrderPaymentStatus.COMPLETED,
              status:
                payment.order.status === PrismaOrderStatus.PENDING
                  ? PrismaOrderStatus.CONFIRMED
                  : payment.order.status,
            },
          });

          await tx.auditLog.create({
            data: {
              userId: userId || null,
              action: "PAYMENT_SUCCEEDED",
              entity: "Payment",
              entityId: payment.id,
              metadata: {
                orderNumber: payment.order.orderNumber,
                amount: Number(payment.amount),
                provider: payment.provider,
              },
            },
          });

          return { updatedPayment: upPay, updatedOrder: upOrd };
        },
      );

      this.logger.log(
        `Payment ${payment.id} verified SUCCEEDED. Order ${updatedOrder.orderNumber} transitioned to CONFIRMED / COMPLETED.`,
      );

      return {
        success: true,
        payment: this.mapPaymentToResponse(
          updatedPayment,
          updatedOrder.orderNumber,
        ),
        orderNumber: updatedOrder.orderNumber,
        orderStatus: updatedOrder.status,
        paymentStatus: updatedOrder.paymentStatus,
        message: "Payment successfully verified and order confirmed.",
      };
    } else {
      // Record failed transaction state
      const failedPayment = await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PrismaPaymentStatus.FAILED,
          errorMessage:
            verificationResult.errorMessage ||
            "Payment verification failed with provider.",
        },
      });

      this.logger.warn(
        `Payment ${payment.id} verification FAILED: ${failedPayment.errorMessage}`,
      );

      return {
        success: false,
        payment: this.mapPaymentToResponse(
          failedPayment,
          payment.order.orderNumber,
        ),
        orderNumber: payment.order.orderNumber,
        orderStatus: payment.order.status,
        paymentStatus: payment.order.paymentStatus,
        message:
          failedPayment.errorMessage ||
          "Payment verification could not be completed.",
      };
    }
  }

  /**
   * Secure Webhook Handler.
   * Verifies signature, enforces idempotency, and atomically updates order/payment state.
   */
  async handleWebhook(
    rawBody: string | Buffer,
    headers: Record<string, string | string[] | undefined>,
  ): Promise<{ status: string; message: string }> {
    const webhookResult: WebhookEventResult =
      await this.paymentProvider.handleWebhook(rawBody, headers);

    if (!webhookResult.signatureValid) {
      this.logger.warn("Rejected webhook: invalid signature.");
      throw new UnauthorizedException("Invalid webhook signature.");
    }

    if (webhookResult.status === "IGNORED") {
      return {
        status: "ignored",
        message: "Event ignored by provider handler.",
      };
    }

    // Locate matching payment record
    const payment = await this.prisma.payment.findFirst({
      where: {
        OR: [
          ...(webhookResult.providerPaymentId
            ? [{ providerPaymentId: webhookResult.providerPaymentId }]
            : []),
          ...(webhookResult.providerOrderId
            ? [{ providerOrderId: webhookResult.providerOrderId }]
            : []),
          ...(webhookResult.orderId
            ? [{ orderId: webhookResult.orderId }]
            : []),
        ],
      },
      include: { order: true },
    });

    if (!payment || !payment.order) {
      this.logger.warn(
        `Webhook received for unknown transaction/order: providerPaymentId=${webhookResult.providerPaymentId}`,
      );
      return { status: "not_found", message: "Payment transaction not found." };
    }

    // Webhook Idempotency: If already completed, acknowledge without reapplying
    if (
      payment.status === PrismaPaymentStatus.SUCCEEDED &&
      webhookResult.status === PaymentTransactionStatus.SUCCEEDED
    ) {
      this.logger.log(
        `Webhook duplicate event: payment ${payment.id} already marked SUCCEEDED.`,
      );
      return { status: "ok", message: "Event already processed." };
    }

    if (webhookResult.status === PaymentTransactionStatus.SUCCEEDED) {
      // Validate amount and currency if provided by webhook
      if (
        webhookResult.amount &&
        Math.abs(Number(payment.amount) - webhookResult.amount) > 0.01
      ) {
        this.logger.error(
          `Webhook amount mismatch for payment ${payment.id}: expected ₹${payment.amount}, received ₹${webhookResult.amount}`,
        );
        throw new BadRequestException("Webhook payment amount mismatch.");
      }

      await this.prisma.$transaction(async (tx) => {
        await tx.payment.update({
          where: { id: payment.id },
          data: {
            status: PrismaPaymentStatus.SUCCEEDED,
            paidAt: new Date(),
            providerPaymentId:
              webhookResult.providerPaymentId || payment.providerPaymentId,
          },
        });

        await tx.order.update({
          where: { id: payment.orderId },
          data: {
            paymentStatus: PrismaOrderPaymentStatus.COMPLETED,
            status:
              payment.order.status === PrismaOrderStatus.PENDING
                ? PrismaOrderStatus.CONFIRMED
                : payment.order.status,
          },
        });

        await tx.auditLog.create({
          data: {
            userId: payment.order.userId,
            action: "WEBHOOK_PAYMENT_SUCCEEDED",
            entity: "Payment",
            entityId: payment.id,
            metadata: {
              orderNumber: payment.order.orderNumber,
              eventType: webhookResult.eventType,
            },
          },
        });
      });

      this.logger.log(
        `Webhook processed SUCCEEDED for payment ${payment.id}, order ${payment.order.orderNumber}`,
      );
    } else if (webhookResult.status === PaymentTransactionStatus.FAILED) {
      await this.prisma.payment.update({
        where: { id: payment.id },
        data: {
          status: PrismaPaymentStatus.FAILED,
          errorMessage: `Provider event: ${webhookResult.eventType}`,
        },
      });
      this.logger.log(
        `Webhook processed FAILED for payment ${payment.id}, order ${payment.order.orderNumber}`,
      );
    }

    return { status: "ok", message: "Webhook successfully processed." };
  }

  /**
   * Retrieve active payment information for an order.
   */
  async getPaymentByOrder(
    orderIdentifier: string,
    userId: string | null = null,
  ): Promise<PaymentResponse | null> {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderIdentifier }, { orderNumber: orderIdentifier }],
      },
      include: {
        payments: {
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found or unauthorized access.");
    }

    if (order.userId && order.userId !== userId) {
      throw new NotFoundException("Order not found or unauthorized access.");
    }

    const latestPayment = order.payments[0];
    if (!latestPayment) {
      return null;
    }

    return this.mapPaymentToResponse(latestPayment, order.orderNumber);
  }

  /**
   * Map database Payment model to typed PaymentResponse DTO.
   */
  private mapPaymentToResponse(
    payment: any,
    orderNumber: string,
    extra?: { keyId?: string; clientSecret?: string; checkoutUrl?: string },
  ): PaymentResponse {
    const meta =
      typeof payment.metadata === "object" && payment.metadata !== null
        ? (payment.metadata as Record<string, any>)
        : {};

    return {
      id: payment.id,
      orderId: payment.orderId,
      orderNumber,
      provider: payment.provider,
      providerPaymentId: payment.providerPaymentId || null,
      providerOrderId: payment.providerOrderId || null,
      amount: Number(payment.amount),
      currency: payment.currency,
      status: payment.status as unknown as PaymentTransactionStatus,
      errorMessage: payment.errorMessage || null,
      paidAt:
        payment.paidAt instanceof Date
          ? payment.paidAt.toISOString()
          : payment.paidAt || null,
      createdAt:
        payment.createdAt instanceof Date
          ? payment.createdAt.toISOString()
          : payment.createdAt,
      updatedAt:
        payment.updatedAt instanceof Date
          ? payment.updatedAt.toISOString()
          : payment.updatedAt,
      clientSecret: extra?.clientSecret || meta?.clientSecret || null,
      checkoutUrl: extra?.checkoutUrl || meta?.checkoutUrl || null,
      keyId: extra?.keyId || meta?.keyId || null,
      metadata: meta,
    };
  }
}
