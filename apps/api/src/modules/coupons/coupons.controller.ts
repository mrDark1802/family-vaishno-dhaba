import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { CouponsService } from "./coupons.service";
import {
  CreateCouponDto,
  UpdateCouponDto,
  ValidateCouponDto,
  CouponSummary,
  CouponValidationResult,
} from "@repo/types";
import { OptionalAuthGuard } from "../../common/guards/optional-auth.guard";

@Controller("coupons")
export class CouponsController {
  constructor(private readonly couponsService: CouponsService) {}

  @Get()
  async getCoupons(
    @Query("includeInactive") includeInactive?: string,
  ): Promise<CouponSummary[]> {
    return this.couponsService.getCoupons(includeInactive === "true");
  }

  @Get(":id")
  async getCoupon(@Param("id") id: string): Promise<CouponSummary> {
    return this.couponsService.getCouponById(id);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalAuthGuard)
  async createCoupon(@Body() dto: CreateCouponDto): Promise<CouponSummary> {
    return this.couponsService.createCoupon(dto);
  }

  @Patch(":id")
  @UseGuards(OptionalAuthGuard)
  async updateCoupon(
    @Param("id") id: string,
    @Body() dto: UpdateCouponDto,
  ): Promise<CouponSummary> {
    return this.couponsService.updateCoupon(id, dto);
  }

  @Patch(":id/toggle")
  @UseGuards(OptionalAuthGuard)
  async toggleCoupon(@Param("id") id: string): Promise<CouponSummary> {
    return this.couponsService.toggleCoupon(id);
  }

  @Delete(":id")
  @UseGuards(OptionalAuthGuard)
  async deleteCoupon(
    @Param("id") id: string,
  ): Promise<{ success: boolean; message: string }> {
    return this.couponsService.deleteCoupon(id);
  }

  @Post("validate")
  @HttpCode(HttpStatus.OK)
  async validateCoupon(
    @Body() dto: ValidateCouponDto,
  ): Promise<CouponValidationResult> {
    return this.couponsService.validateCoupon(dto.code, dto.orderSubtotal);
  }
}
