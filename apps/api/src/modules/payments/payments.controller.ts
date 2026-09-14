import {
  Controller,
  Post,
  Get,
  Body,
  Param,
  Headers,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { PaymentsService } from "./payments.service";
import { CreatePaymentDto } from "./dto/create-payment.dto";
import { VerifyPaymentDto } from "./dto/verify-payment.dto";
import { OptionalAuthGuard } from "../../common/guards/optional-auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  CustomerProfile,
  PaymentResponse,
  PaymentVerificationResponse,
} from "@repo/types";

@Controller("payments")
export class PaymentsController {
  constructor(private readonly paymentsService: PaymentsService) {}

  /**
   * Initiate/retrieve payment attempt for an order.
   * Amount & currency are strictly authoritative from PostgreSQL.
   */
  @Post("create")
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async createPayment(
    @Body() dto: CreatePaymentDto,
    @CurrentUser() user: CustomerProfile | null,
    @Headers("idempotency-key") idempotencyKey?: string,
  ): Promise<PaymentResponse> {
    const userId = user?.id || null;
    return this.paymentsService.createPayment(dto, userId, idempotencyKey);
  }

  /**
   * Server-side payment verification.
   * Verifies signature and provider status; atomic transition on success.
   */
  @Post("verify")
  @HttpCode(HttpStatus.OK)
  @UseGuards(OptionalAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async verifyPayment(
    @Body() dto: VerifyPaymentDto,
    @CurrentUser() user: CustomerProfile | null,
  ): Promise<PaymentVerificationResponse> {
    const userId = user?.id || null;
    return this.paymentsService.verifyPayment(dto, userId);
  }

  /**
   * Retrieve active payment details for a specific order.
   */
  @Get("order/:orderId")
  @UseGuards(OptionalAuthGuard)
  async getPaymentByOrder(
    @Param("orderId") orderId: string,
    @CurrentUser() user: CustomerProfile | null,
  ): Promise<PaymentResponse | null> {
    const userId = user?.id || null;
    return this.paymentsService.getPaymentByOrder(orderId, userId);
  }

  /**
   * Provider Webhook Endpoint.
   * Public endpoint with raw body HMAC signature verification and idempotency.
   */
  @Post("webhook")
  @HttpCode(HttpStatus.OK)
  @Throttle({ default: { limit: 60, ttl: 60000 } })
  async handleWebhook(
    @Req() req: any,
    @Headers() headers: Record<string, string | string[] | undefined>,
  ): Promise<{ status: string; message: string }> {
    const rawBody = req.rawBody || JSON.stringify(req.body || {});
    return this.paymentsService.handleWebhook(rawBody, headers);
  }
}
