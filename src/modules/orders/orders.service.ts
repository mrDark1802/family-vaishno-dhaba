import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "@prisma/client";
import { CreateOrderDto } from "./dto/create-order.dto";
import {
  OrderResponse,
  OrderStatus,
  OrderType,
  PaymentMethod,
  PaymentStatus,
  OrderSummary,
  PortionOption,
} from "../../types";
import * as crypto from "crypto";

import { VerificationService } from "../verification/verification.service";

@Injectable()
export class OrdersService {
  private readonly logger = new Logger(OrdersService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly verificationService: VerificationService,
  ) {}

  /**
   * Create an order with server-authoritative pricing and atomic database transaction.
   */
  async createOrder(
    dto: CreateOrderDto,
    userId: string | null = null,
    idempotencyKey?: string,
  ): Promise<OrderResponse> {
    // 1. Idempotency Check: Return existing order if key matches
    if (idempotencyKey && idempotencyKey.trim()) {
      const existing = await this.prisma.order.findUnique({
        where: { idempotencyKey: idempotencyKey.trim() },
        include: { items: true },
      });
      if (existing) {
        this.logger.log(
          `Idempotent order request resolved: returning existing order ${existing.orderNumber}`,
        );
        return this.mapOrderToResponse(existing);
      }
    }

    // 2. Validate Delivery Address Requirements
    if (dto.orderType === OrderType.DELIVERY) {
      if (!dto.deliveryAddress || !dto.deliveryAddress.trim()) {
        throw new BadRequestException(
          "Delivery address is required for doorstep delivery orders",
        );
      }
      if (!dto.city || !dto.city.trim()) {
        throw new BadRequestException("City is required for delivery orders");
      }
      if (!dto.pincode || !/^\d{6}$/.test(dto.pincode.trim())) {
        throw new BadRequestException(
          "Valid 6-digit postal PIN code is required for delivery orders",
        );
      }
    }

    // 3. Resolve & Verify Products from PostgreSQL
    const productIds = Array.from(new Set(dto.items.map((i) => i.productId)));
    const products = await this.prisma.product.findMany({
      where: { id: { in: productIds } },
    });

    const productMap = new Map(products.map((p) => [p.id, p]));

    for (const item of dto.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        throw new BadRequestException(
          `Menu item with ID "${item.productId}" was not found.`,
        );
      }
      if (!product.isActive || !product.isAvailable) {
        throw new BadRequestException(
          `Item "${product.name}" is currently unavailable for ordering.`,
        );
      }
      if (item.quantity < 1 || item.quantity > 20) {
        throw new BadRequestException(
          `Invalid quantity for "${product.name}". Must be between 1 and 20.`,
        );
      }
    }

    // 4. Server-Side Customization & Portion Verification and Price Calculation
    const processedItems: Array<{
      productId: string;
      productName: string;
      portion: string;
      baseUnitPrice: Prisma.Decimal;
      customization: string | null;
      customizationPrice: Prisma.Decimal;
      unitPrice: Prisma.Decimal;
      quantity: number;
      subtotal: Prisma.Decimal;
      notes: string | null;
    }> = [];

    for (const item of dto.items) {
      const product = productMap.get(item.productId)!;
      let customizationPriceAdjustment = 0;
      let validCustomization: string | null = null;

      if (item.customization && item.customization.trim()) {
        const requestedCustom = item.customization.trim();
        let foundChoice = false;

        if (
          product.customizationOptions &&
          Array.isArray(product.customizationOptions)
        ) {
          for (const optGroup of product.customizationOptions as any[]) {
            if (optGroup && Array.isArray(optGroup.choices)) {
              const choice = optGroup.choices.find(
                (c: any) =>
                  c &&
                  typeof c.name === "string" &&
                  c.name.toLowerCase() === requestedCustom.toLowerCase(),
              );
              if (choice) {
                foundChoice = true;
                customizationPriceAdjustment = Number(choice.price) || 0;
                validCustomization = choice.name;
                break;
              }
            }
          }
        }

        if (!foundChoice) {
          throw new BadRequestException(
            `Customization "${requestedCustom}" is invalid for "${product.name}".`,
          );
        }
      }

      // Handle Portion Selection (Half vs Full)
      const selectedPortion = item.portion === "HALF" ? "HALF" : "FULL";
      let basePrice = Number(product.price);

      if (selectedPortion === "HALF") {
        if (!product.hasHalfOption || product.halfPrice === null || product.halfPrice === undefined) {
          throw new BadRequestException(
            `Half portion is not available for "${product.name}".`,
          );
        }
        basePrice = Number(product.halfPrice);
      }

      const unitPrice = basePrice + customizationPriceAdjustment;
      const lineSubtotal = unitPrice * item.quantity;

      processedItems.push({
        productId: product.id,
        productName: product.name,
        portion: selectedPortion,
        baseUnitPrice: new Prisma.Decimal(basePrice),
        customization: validCustomization,
        customizationPrice: new Prisma.Decimal(customizationPriceAdjustment),
        unitPrice: new Prisma.Decimal(unitPrice),
        quantity: item.quantity,
        subtotal: new Prisma.Decimal(lineSubtotal),
        notes: item.notes?.trim() || null,
      });
    }

    // 5. Total Financial Calculations & Coupon Discount
    const subtotal = processedItems.reduce(
      (sum, item) => sum + Number(item.subtotal),
      0,
    );
    const deliveryFee = 0; // Pure vegetarian dhaba policy: Free delivery
    const taxAmount = 0; // Prices are tax-inclusive
    let discountAmount = 0;
    let validatedCouponId: string | null = null;

    if (dto.couponCode && dto.couponCode.trim()) {
      const cleanCode = dto.couponCode.trim().toUpperCase();
      const coupon = await this.prisma.coupon.findUnique({
        where: { code: cleanCode },
      });

      if (!coupon || !coupon.isActive) {
        throw new BadRequestException(`Coupon code "${cleanCode}" is invalid or inactive.`);
      }

      if (coupon.validUntil && new Date() > new Date(coupon.validUntil)) {
        throw new BadRequestException(`Coupon code "${cleanCode}" has expired.`);
      }

      if (coupon.maxUsage && coupon.usageCount >= coupon.maxUsage) {
        throw new BadRequestException(`Coupon code "${cleanCode}" usage limit reached.`);
      }

      const minAmount = Number(coupon.minOrderAmount);
      if (subtotal < minAmount) {
        throw new BadRequestException(
          `Minimum order amount for coupon "${cleanCode}" is ₹${minAmount}.`,
        );
      }

      if (coupon.discountType === "FLAT") {
        discountAmount = Math.min(Number(coupon.value), subtotal);
      } else {
        discountAmount = Math.round((subtotal * Number(coupon.value)) / 100);
        if (coupon.maxDiscount) {
          discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
        }
      }

      validatedCouponId = coupon.id;
    }

    const totalAmount = Math.max(0, subtotal + deliveryFee + taxAmount - discountAmount);

    // 6. Generate Unique Order Number
    const orderNumber = this.generateOrderNumber();

    // 7. Atomic PostgreSQL Transaction
    const order = await this.prisma.$transaction(async (tx) => {
      // Increment coupon usage count if coupon was applied
      if (validatedCouponId) {
        await tx.coupon.update({
          where: { id: validatedCouponId },
          data: { usageCount: { increment: 1 } },
        });
      }

      // Consume phone verification token atomically if provided
      if (dto.phoneVerificationToken && dto.phoneVerificationToken.trim()) {
        await this.verificationService.validateAndConsumeToken(
          dto.customerPhone,
          dto.phoneVerificationToken.trim(),
          tx,
        );
      }

      const createdOrder = await tx.order.create({
        data: {
          orderNumber,
          userId: userId || null,
          customerName: dto.customerName.trim(),
          customerPhone: dto.customerPhone.trim(),
          customerEmail: dto.customerEmail?.trim() || null,
          deliveryAddress: dto.deliveryAddress?.trim() || null,
          landmark: dto.landmark?.trim() || null,
          city: dto.city?.trim() || null,
          pincode: dto.pincode?.trim() || null,
          status: OrderStatus.PENDING,
          orderType: dto.orderType,
          paymentStatus: PaymentStatus.PENDING,
          paymentMethod: dto.paymentMethod || PaymentMethod.CASH_ON_DELIVERY,
          subtotal: new Prisma.Decimal(subtotal),
          deliveryFee: new Prisma.Decimal(deliveryFee),
          taxAmount: new Prisma.Decimal(taxAmount),
          discountAmount: new Prisma.Decimal(discountAmount),
          totalAmount: new Prisma.Decimal(totalAmount),
          notes: dto.notes?.trim() || null,
          idempotencyKey: idempotencyKey ? idempotencyKey.trim() : null,
          items: {
            create: processedItems.map((item) => ({
              productId: item.productId,
              productName: item.productName,
              portion: item.portion,
              baseUnitPrice: item.baseUnitPrice,
              customization: item.customization,
              customizationPrice: item.customizationPrice,
              unitPrice: item.unitPrice,
              quantity: item.quantity,
              subtotal: item.subtotal,
              notes: item.notes,
            })),
          },
        },
        include: {
          items: true,
        },
      });

      return createdOrder;
    });

    this.logger.log(
      `Order ${order.orderNumber} successfully created. Total: ₹${totalAmount}, Items: ${order.items.length}`,
    );

    return this.mapOrderToResponse(order);
  }

  /**
   * Find order by ID or orderNumber.
   */
  async getOrderByIdOrNumber(
    identifier: string,
    requestingUserId?: string,
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: identifier }, { orderNumber: identifier }],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException(`Order "${identifier}" was not found.`);
    }

    return this.mapOrderToResponse(order);
  }

  /**
   * Get past orders for an authenticated user with server-side pagination.
   */
  async getUserOrders(
    userId: string,
    page = 1,
    limit = 20,
  ): Promise<{
    items: OrderSummary[];
    pagination: {
      page: number;
      limit: number;
      total: number;
      totalPages: number;
      hasNextPage: boolean;
    };
  }> {
    const safePage = Math.max(1, page);
    const safeLimit = Math.min(50, Math.max(1, limit));
    const skip = (safePage - 1) * safeLimit;

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where: { userId } }),
      this.prisma.order.findMany({
        where: { userId },
        orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        skip,
        take: safeLimit,
        include: {
          items: {
            select: { quantity: true },
          },
        },
      }),
    ]);

    const totalPages = Math.ceil(total / safeLimit) || 1;
    const hasNextPage = safePage < totalPages;

    const items = orders.map((o) => ({
      id: o.id,
      orderNumber: o.orderNumber,
      status: o.status as OrderStatus,
      orderType: o.orderType as OrderType,
      paymentStatus: o.paymentStatus as PaymentStatus,
      totalAmount: Number(o.totalAmount),
      itemCount: o.items.reduce((sum, item) => sum + item.quantity, 0),
      createdAt:
        o.createdAt instanceof Date ? o.createdAt.toISOString() : o.createdAt,
    }));

    return {
      items,
      pagination: {
        page: safePage,
        limit: safeLimit,
        total,
        totalPages,
        hasNextPage,
      },
    };
  }

  /**
   * Securely retrieve order details belonging to the authenticated customer.
   */
  async getUserOrderById(
    userId: string,
    identifier: string,
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: {
        userId,
        OR: [{ id: identifier }, { orderNumber: identifier }],
      },
      include: {
        items: true,
      },
    });

    if (!order) {
      throw new NotFoundException("Order not found or unauthorized access.");
    }

    return this.mapOrderToResponse(order);
  }

  /**
   * Admin: List all orders with filtering and full details.
   */
  async getAllOrdersAdmin(params?: {
    status?: string;
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<{
    orders: OrderResponse[];
    total: number;
    page: number;
    totalPages: number;
  }> {
    const page = Math.max(1, params?.page || 1);
    const limit = Math.min(100, Math.max(1, params?.limit || 20));
    const skip = (page - 1) * limit;

    const where: Prisma.OrderWhereInput = {};

    if (params?.status && params.status !== "ALL") {
      where.status = params.status as OrderStatus;
    }

    if (params?.search && params.search.trim()) {
      const q = params.search.trim();
      where.OR = [
        { orderNumber: { contains: q, mode: "insensitive" } },
        { customerName: { contains: q, mode: "insensitive" } },
        { customerPhone: { contains: q, mode: "insensitive" } },
      ];
    }

    const [total, orders] = await Promise.all([
      this.prisma.order.count({ where }),
      this.prisma.order.findMany({
        where,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: { items: true },
      }),
    ]);

    const totalPages = Math.ceil(total / limit) || 1;

    return {
      orders: orders.map((o) => this.mapOrderToResponse(o)),
      total,
      page,
      totalPages,
    };
  }

  /**
   * Admin: Update order status.
   */
  async updateOrderStatusAdmin(
    orderId: string,
    newStatus: OrderStatus,
    notes?: string,
  ): Promise<OrderResponse> {
    const order = await this.prisma.order.findFirst({
      where: {
        OR: [{ id: orderId }, { orderNumber: orderId }],
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    const updated = await this.prisma.order.update({
      where: { id: order.id },
      data: {
        status: newStatus,
        notes: notes !== undefined ? notes : order.notes,
      },
      include: { items: true },
    });

    this.logger.log(`Order ${order.orderNumber} status updated to ${newStatus}`);
    return this.mapOrderToResponse(updated);
  }

  /**
   * Admin: Get kitchen & revenue operational statistics.
   */
  async getAdminStats(): Promise<{
    todayRevenue: number;
    todayOrders: number;
    activeKitchenOrders: number;
    completedOrders: number;
    averageOrderValue: number;
  }> {
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);

    const [todayOrdersList, activeCount, completedCount] = await Promise.all([
      this.prisma.order.findMany({
        where: {
          createdAt: { gte: todayStart },
          status: { not: OrderStatus.CANCELLED },
        },
        select: { totalAmount: true },
      }),
      this.prisma.order.count({
        where: {
          status: {
            in: [
              OrderStatus.PENDING,
              OrderStatus.CONFIRMED,
              OrderStatus.PREPARING,
              OrderStatus.READY_FOR_PICKUP,
              OrderStatus.OUT_FOR_DELIVERY,
            ],
          },
        },
      }),
      this.prisma.order.count({
        where: {
          status: OrderStatus.DELIVERED,
        },
      }),
    ]);

    const todayRevenue = todayOrdersList.reduce(
      (sum, o) => sum + Number(o.totalAmount),
      0,
    );
    const todayOrders = todayOrdersList.length;
    const averageOrderValue =
      todayOrders > 0 ? Math.round(todayRevenue / todayOrders) : 0;

    return {
      todayRevenue,
      todayOrders,
      activeKitchenOrders: activeCount,
      completedOrders: completedCount,
      averageOrderValue,
    };
  }

  /**
   * Generate human-readable order number: FVD-YYYYMMDD-XXXX
   */
  private generateOrderNumber(): string {
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, "");
    const randomSuffix = crypto.randomInt(1000, 9999).toString();
    return `FVD-${dateStr}-${randomSuffix}`;
  }

  /**
   * Map database model to typed API response.
   */
  private mapOrderToResponse(order: any): OrderResponse {
    return {
      id: order.id,
      orderNumber: order.orderNumber,
      userId: order.userId || null,
      customerName: order.customerName,
      customerPhone: order.customerPhone,
      customerEmail: order.customerEmail || null,
      deliveryAddress: order.deliveryAddress || null,
      landmark: order.landmark || null,
      city: order.city || null,
      pincode: order.pincode || null,
      status: order.status as OrderStatus,
      orderType: order.orderType as OrderType,
      paymentStatus: order.paymentStatus as PaymentStatus,
      paymentMethod: order.paymentMethod as PaymentMethod,
      subtotal: Number(order.subtotal),
      taxAmount: Number(order.taxAmount),
      deliveryFee: Number(order.deliveryFee),
      discountAmount: Number(order.discountAmount),
      totalAmount: Number(order.totalAmount),
      notes: order.notes || null,
      createdAt:
        order.createdAt instanceof Date
          ? order.createdAt.toISOString()
          : order.createdAt,
      updatedAt:
        order.updatedAt instanceof Date
          ? order.updatedAt.toISOString()
          : order.updatedAt,
      items: (order.items || []).map((item: any) => ({
        id: item.id,
        productId: item.productId || null,
        productName: item.productName,
        portion: (item.portion as PortionOption) || "FULL",
        baseUnitPrice: Number(item.baseUnitPrice || item.unitPrice),
        customization: item.customization || null,
        customizationPrice: Number(item.customizationPrice || 0),
        unitPrice: Number(item.unitPrice),
        quantity: item.quantity,
        subtotal: Number(item.subtotal),
        notes: item.notes || null,
      })),
    };
  }
}
