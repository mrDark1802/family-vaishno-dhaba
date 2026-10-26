import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  Query,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from "@nestjs/common";
import { Request } from "express";
import { DeliveryService } from "./delivery.service";
import { AuthGuard } from "../../common/guards/auth.guard";
import { OptionalAuthGuard } from "../../common/guards/optional-auth.guard";
import { RolesGuard } from "../../common/guards/roles.guard";
import { Roles } from "../../common/decorators/roles.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { CustomerProfile, UserRole } from "../../types";
import { ActivateDriverDto } from "./dto/activate-driver.dto";
import { CreateDriverDto } from "./dto/create-driver.dto";
import { UpdateDriverStatusDto } from "./dto/update-driver-status.dto";
import { UpdateAvailabilityDto } from "./dto/update-availability.dto";
import { AssignDriverDto, ReassignDriverDto } from "./dto/assign-driver.dto";
import { UpdateDeliveryStatusDto } from "./dto/update-delivery-status.dto";
import { RecordLocationDto } from "./dto/record-location.dto";

@Controller("delivery")
export class DeliveryController {
  constructor(private readonly deliveryService: DeliveryService) {}

  // ---------------------------------------------------------------------------
  // Admin Endpoints
  // ---------------------------------------------------------------------------

  @Get("admin/drivers")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async listDrivers(
    @Query("status") status?: any,
    @Query("availability") availability?: any,
  ) {
    return this.deliveryService.listDrivers({ status, availability });
  }

  @Get("admin/users/search")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async searchCandidateUsers(@Query("q") query: string) {
    return this.deliveryService.searchCandidateUsers(query);
  }

  @Post("admin/drivers/create")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async createAndActivateDriver(
    @Body() dto: CreateDriverDto,
    @CurrentUser() user: CustomerProfile,
    @Req() req: Request,
  ) {
    return this.deliveryService.createAndActivateDriver(
      dto,
      user.id,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @Post("admin/drivers/activate")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async activateDriver(
    @Body() dto: ActivateDriverDto,
    @CurrentUser() user: CustomerProfile,
    @Req() req: Request,
  ) {
    return this.deliveryService.activateDriver(
      dto,
      user.id,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @Patch("admin/drivers/:id/status")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async updateDriverStatus(
    @Param("id") driverId: string,
    @Body() dto: UpdateDriverStatusDto,
    @CurrentUser() user: CustomerProfile,
    @Req() req: Request,
  ) {
    return this.deliveryService.updateDriverStatus(
      driverId,
      dto,
      user.id,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @Post("admin/assign")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async assignDriver(
    @Body() dto: AssignDriverDto,
    @CurrentUser() user: CustomerProfile,
    @Req() req: Request,
  ) {
    return this.deliveryService.assignDriverToOrder(
      dto,
      user.id,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @Post("admin/reassign")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async reassignDriver(
    @Body() dto: ReassignDriverDto,
    @CurrentUser() user: CustomerProfile,
    @Req() req: Request,
  ) {
    return this.deliveryService.reassignDriver(
      dto,
      user.id,
      req.ip,
      req.headers["user-agent"],
    );
  }

  @Get("admin/active-deliveries")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.ADMIN)
  async getActiveDeliveriesAdmin() {
    return this.deliveryService.getActiveDeliveriesAdmin();
  }

  // ---------------------------------------------------------------------------
  // Driver Endpoints
  // ---------------------------------------------------------------------------

  @Get("driver/profile")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  async getDriverProfile(@CurrentUser() user: CustomerProfile) {
    return this.deliveryService.getDriverProfile(user.id);
  }

  @Patch("driver/availability")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  async updateAvailability(
    @CurrentUser() user: CustomerProfile,
    @Body() dto: UpdateAvailabilityDto,
  ) {
    return this.deliveryService.updateAvailability(user.id, dto.availability);
  }

  @Get("driver/active")
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  async getMyActiveDelivery(@CurrentUser() user: CustomerProfile) {
    return this.deliveryService.getMyActiveDelivery(user.id);
  }

  @Post("driver/assignment/:id/transition")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  async transitionStatus(
    @Param("id") assignmentId: string,
    @CurrentUser() user: CustomerProfile,
    @Body() dto: UpdateDeliveryStatusDto,
  ) {
    return this.deliveryService.transitionDeliveryStatus(
      user.id,
      assignmentId,
      dto.status,
      dto.notes,
      dto.cancellationReason,
    );
  }

  @Post("driver/location")
  @HttpCode(HttpStatus.OK)
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(UserRole.DRIVER, UserRole.ADMIN)
  async reportLocation(
    @CurrentUser() user: CustomerProfile,
    @Body() dto: RecordLocationDto,
  ) {
    return this.deliveryService.recordDriverLocation(user.id, dto);
  }

  // ---------------------------------------------------------------------------
  // Customer Live Tracking
  // ---------------------------------------------------------------------------

  @Get("track/:orderId")
  @UseGuards(OptionalAuthGuard)
  async trackOrder(
    @Param("orderId") orderId: string,
    @CurrentUser() user: CustomerProfile | null,
  ) {
    return this.deliveryService.getDeliveryTracking(
      orderId,
      user?.id,
      user?.role,
    );
  }
}
