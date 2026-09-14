import {
  Injectable,
  NotFoundException,
  BadRequestException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { Prisma } from "@prisma/client";
import {
  CouponSummary,
  CreateCouponDto,
  UpdateCouponDto,
  CouponValidationResult,
} from "../../types";

@Injectable()
export class CouponsService {
  private readonly logger = new Logger(CouponsService.name);

  constructor(private readonly prisma: PrismaService) {}

  /**
   * Fetch all coupons (admin sees all, customer sees active only)
   */
  async getCoupons(includeInactive = false): Promise<CouponSummary[]> {
    const where: Prisma.CouponWhereInput = {};
    if (!includeInactive) {
      where.isActive = true;
    }

    const coupons = await this.prisma.coupon.findMany({
      where,
      orderBy: { createdAt: "desc" },
    });

    return coupons.map((c) => this.mapCouponToSummary(c));
  }

  /**
   * Fetch single coupon by ID or Code
   */
  async getCouponById(idOrCode: string): Promise<CouponSummary> {
    const coupon = await this.prisma.coupon.findFirst({
      where: {
        OR: [{ id: idOrCode }, { code: idOrCode.toUpperCase() }],
      },
    });

    if (!coupon) {
      throw new NotFoundException(`Coupon "${idOrCode}" not found.`);
    }

    return this.mapCouponToSummary(coupon);
  }

  /**
   * Admin: Create a new promotional coupon
   */
  async createCoupon(dto: CreateCouponDto): Promise<CouponSummary> {
    const code = dto.code.trim().toUpperCase();

    const existing = await this.prisma.coupon.findUnique({
      where: { code },
    });

    if (existing) {
      throw new BadRequestException(`Coupon code "${code}" already exists.`);
    }

    const created = await this.prisma.coupon.create({
      data: {
        code,
        title: dto.title.trim(),
        description: dto.description?.trim() || null,
        discountType: dto.discountType || "FLAT",
        value: new Prisma.Decimal(dto.value),
        minOrderAmount: new Prisma.Decimal(dto.minOrderAmount || 0),
        maxDiscount:
          dto.maxDiscount !== undefined && dto.maxDiscount !== null
            ? new Prisma.Decimal(dto.maxDiscount)
            : null,
        maxUsage: dto.maxUsage || null,
        isActive: dto.isActive ?? true,
        validUntil: dto.validUntil ? new Date(dto.validUntil) : null,
      },
    });

    this.logger.log(`Created coupon: ${created.code} (${created.id})`);
    return this.mapCouponToSummary(created);
  }

  /**
   * Admin: Update an existing coupon
   */
  async updateCoupon(id: string, dto: UpdateCouponDto): Promise<CouponSummary> {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Coupon with ID "${id}" not found.`);
    }

    const updateData: Prisma.CouponUpdateInput = {};
    if (dto.code !== undefined) updateData.code = dto.code.trim().toUpperCase();
    if (dto.title !== undefined) updateData.title = dto.title.trim();
    if (dto.description !== undefined)
      updateData.description = dto.description?.trim() || null;
    if (dto.discountType !== undefined)
      updateData.discountType = dto.discountType;
    if (dto.value !== undefined)
      updateData.value = new Prisma.Decimal(dto.value);
    if (dto.minOrderAmount !== undefined)
      updateData.minOrderAmount = new Prisma.Decimal(dto.minOrderAmount);
    if (dto.maxDiscount !== undefined) {
      updateData.maxDiscount =
        dto.maxDiscount !== null ? new Prisma.Decimal(dto.maxDiscount) : null;
    }
    if (dto.maxUsage !== undefined) updateData.maxUsage = dto.maxUsage;
    if (dto.isActive !== undefined) updateData.isActive = dto.isActive;
    if (dto.validUntil !== undefined) {
      updateData.validUntil = dto.validUntil ? new Date(dto.validUntil) : null;
    }

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: updateData,
    });

    return this.mapCouponToSummary(updated);
  }

  /**
   * Admin: Toggle coupon active state
   */
  async toggleCoupon(id: string): Promise<CouponSummary> {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Coupon with ID "${id}" not found.`);
    }

    const updated = await this.prisma.coupon.update({
      where: { id },
      data: { isActive: !existing.isActive },
    });

    return this.mapCouponToSummary(updated);
  }

  /**
   * Admin: Delete coupon
   */
  async deleteCoupon(id: string): Promise<{ success: boolean; message: string }> {
    const existing = await this.prisma.coupon.findUnique({ where: { id } });
    if (!existing) {
      throw new NotFoundException(`Coupon with ID "${id}" not found.`);
    }

    await this.prisma.coupon.delete({ where: { id } });
    this.logger.log(`Deleted coupon: ${existing.code} (${id})`);

    return {
      success: true,
      message: `Coupon "${existing.code}" deleted successfully.`,
    };
  }

  /**
   * Validate coupon against an order subtotal
   */
  async validateCoupon(
    code: string,
    orderSubtotal: number,
  ): Promise<CouponValidationResult> {
    const cleanCode = code.trim().toUpperCase();
    const coupon = await this.prisma.coupon.findUnique({
      where: { code: cleanCode },
    });

    if (!coupon || !coupon.isActive) {
      return {
        valid: false,
        message: "Invalid or expired promo code.",
      };
    }

    if (coupon.validUntil && new Date() > new Date(coupon.validUntil)) {
      return {
        valid: false,
        message: "This promo code has expired.",
      };
    }

    const minAmount = Number(coupon.minOrderAmount);
    if (orderSubtotal < minAmount) {
      return {
        valid: false,
        message: `Cart subtotal must be at least ₹${minAmount} to use this coupon.`,
      };
    }

    let discountAmount = 0;
    if (coupon.discountType === "FLAT") {
      discountAmount = Math.min(Number(coupon.value), orderSubtotal);
    } else {
      discountAmount = Math.round((orderSubtotal * Number(coupon.value)) / 100);
      if (coupon.maxDiscount) {
        discountAmount = Math.min(discountAmount, Number(coupon.maxDiscount));
      }
    }

    return {
      valid: true,
      code: coupon.code,
      discountAmount,
      message: `Coupon "${coupon.code}" applied! You saved ₹${discountAmount}.`,
    };
  }

  private mapCouponToSummary(coupon: any): CouponSummary {
    return {
      id: coupon.id,
      code: coupon.code,
      title: coupon.title,
      description: coupon.description || null,
      discountType: coupon.discountType as "FLAT" | "PERCENT",
      value: Number(coupon.value),
      minOrderAmount: Number(coupon.minOrderAmount),
      maxDiscount: coupon.maxDiscount ? Number(coupon.maxDiscount) : null,
      usageCount: coupon.usageCount,
      maxUsage: coupon.maxUsage || null,
      isActive: coupon.isActive,
      validUntil: coupon.validUntil
        ? coupon.validUntil instanceof Date
          ? coupon.validUntil.toISOString()
          : coupon.validUntil
        : null,
      createdAt:
        coupon.createdAt instanceof Date
          ? coupon.createdAt.toISOString()
          : coupon.createdAt,
    };
  }
}
