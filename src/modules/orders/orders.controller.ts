import {
  Controller,
  Post,
  Get,
  Patch,
  Body,
  Param,
  Query,
  Headers,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Throttle } from "@nestjs/throttler";
import { OrdersService } from "./orders.service";
import { CreateOrderDto } from "./dto/create-order.dto";
import { OptionalAuthGuard } from "../../common/guards/optional-auth.guard";
import { AuthGuard } from "../../common/guards/auth.guard";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import {
  CustomerProfile,
  OrderResponse,
  OrderStatus,
  PaginatedOrderResponse,
  UpdateOrderStatusDto,
} from "@repo/types";

@Controller("orders")
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  /**
   * Create order with server-authoritative pricing and optional customer identity.
   */
  @Post()
  @HttpCode(HttpStatus.CREATED)
  @UseGuards(OptionalAuthGuard)
  @Throttle({ default: { limit: 20, ttl: 60000 } })
  async createOrder(
    @Body() dto: CreateOrderDto,
    @CurrentUser() user: CustomerProfile | null,
    @Headers("idempotency-key") idempotencyKey?: string,
  ): Promise<OrderResponse> {
    const userId = user?.id || null;
    return this.ordersService.createOrder(dto, userId, idempotencyKey);
  }

  /**
   * Admin: List all orders with filters (status, search, pagination).
   */
  @Get("admin/all")
  @UseGuards(OptionalAuthGuard)
  async getAllOrdersAdmin(
    @Query("status") status?: string,
    @Query("search") search?: string,
    @Query("page") pageQuery?: string,
    @Query("limit") limitQuery?: string,
  ) {
    const page = pageQuery ? parseInt(pageQuery, 10) : 1;
    const limit = limitQuery ? parseInt(limitQuery, 10) : 50;
    return this.ordersService.getAllOrdersAdmin({ status, search, page, limit });
  }

  /**
   * Admin: Get operational revenue & kitchen stats.
   */
  @Get("admin/stats")
  @UseGuards(OptionalAuthGuard)
  async getAdminStats() {
    return this.ordersService.getAdminStats();
  }

  /**
   * Admin: Update order status.
   */
  @Patch(":id/status")
  @UseGuards(OptionalAuthGuard)
  async updateOrderStatus(
    @Param("id") id: string,
    @Body() body: { status: OrderStatus; notes?: string },
  ): Promise<OrderResponse> {
    return this.ordersService.updateOrderStatusAdmin(id, body.status, body.notes);
  }

  /**
   * Get past orders for logged in customer with pagination.
   */
  @Get("my-orders")
  @UseGuards(AuthGuard)
  async getMyOrders(
    @CurrentUser() user: CustomerProfile,
    @Query("page") pageQuery?: string,
    @Query("limit") limitQuery?: string,
  ): Promise<PaginatedOrderResponse> {
    const page = pageQuery ? parseInt(pageQuery, 10) : 1;
    const limit = limitQuery ? parseInt(limitQuery, 10) : 20;
    return this.ordersService.getUserOrders(user.id, page, limit);
  }

  /**
   * Get specific order details for authenticated customer with strict ownership check.
   */
  @Get("my-orders/:id")
  @UseGuards(AuthGuard)
  async getMyOrderDetails(
    @CurrentUser() user: CustomerProfile,
    @Param("id") id: string,
  ): Promise<OrderResponse> {
    return this.ordersService.getUserOrderById(user.id, id);
  }

  /**
   * Retrieve order details by ID or order number (e.g. FVD-20260904-8942) for tracking.
   */
  @Get(":identifier")
  async getOrder(
    @Param("identifier") identifier: string,
  ): Promise<OrderResponse> {
    return this.ordersService.getOrderByIdOrNumber(identifier);
  }
}
