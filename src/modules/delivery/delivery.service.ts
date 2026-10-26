import {
  Injectable,
  NotFoundException,
  BadRequestException,
  ForbiddenException,
  Logger,
  Inject,
  forwardRef,
} from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { RoutingService, LatLng } from "./routing.service";
import { DeliveryGateway } from "./delivery.gateway";
import {
  DriverStatus,
  DriverAvailability,
  DeliveryStatus,
  UserRole,
  OrderStatus,
  DriverProfileSummary,
  DeliveryTrackingResponse,
} from "../../types";
import { ActivateDriverDto } from "./dto/activate-driver.dto";
import { UpdateDriverStatusDto } from "./dto/update-driver-status.dto";
import { AssignDriverDto, ReassignDriverDto } from "./dto/assign-driver.dto";
import { RecordLocationDto } from "./dto/record-location.dto";

export const RESTAURANT_COORDINATES: LatLng = {
  latitude: 31.3397982,
  longitude: 75.5469921,
};

export const RESTAURANT_DETAILS = {
  latitude: 31.3397982,
  longitude: 75.5469921,
  name: "Family Vaishno Dhaba",
  address: "GT Road, Kangra, Himachal Pradesh 176001",
};

@Injectable()
export class DeliveryService {
  private readonly logger = new Logger(DeliveryService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly routingService: RoutingService,
    @Inject(forwardRef(() => DeliveryGateway))
    private readonly deliveryGateway: DeliveryGateway,
  ) {}

  // ---------------------------------------------------------------------------
  // Admin Operations
  // ---------------------------------------------------------------------------

  /**
   * Search candidate registered users for driver activation.
   */
  async searchCandidateUsers(query: string) {
    const trimmed = query?.trim() || "";
    if (trimmed.length < 2) {
      return [];
    }

    const users = await this.prisma.user.findMany({
      where: {
        OR: [
          { phone: { contains: trimmed, mode: "insensitive" } },
          { name: { contains: trimmed, mode: "insensitive" } },
          { email: { contains: trimmed, mode: "insensitive" } },
        ],
      },
      select: {
        id: true,
        name: true,
        phone: true,
        email: true,
        role: true,
        isActive: true,
        driverProfile: {
          select: {
            id: true,
            status: true,
            availability: true,
            vehicleType: true,
            vehicleNumber: true,
          },
        },
      },
      take: 15,
    });

    return users;
  }

  /**
   * Activate or onboard an existing registered user as a driver.
   */
  async activateDriver(
    dto: ActivateDriverDto,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<DriverProfileSummary> {
    const targetUser = await this.prisma.user.findUnique({
      where: { id: dto.userId },
      include: { driverProfile: true },
    });

    if (!targetUser) {
      throw new NotFoundException(`User with ID ${dto.userId} not found.`);
    }

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Update user role to DRIVER if not already ADMIN
      if (targetUser.role !== UserRole.ADMIN) {
        await tx.user.update({
          where: { id: targetUser.id },
          data: { role: UserRole.DRIVER },
        });
      }

      // 2. Upsert Driver Profile
      const profile = await tx.driverProfile.upsert({
        where: { userId: targetUser.id },
        create: {
          userId: targetUser.id,
          status: DriverStatus.ACTIVE,
          availability: DriverAvailability.OFFLINE,
          vehicleType: dto.vehicleType?.trim() || null,
          vehicleNumber: dto.vehicleNumber?.trim() || null,
          licenseNumber: dto.licenseNumber?.trim() || null,
        },
        update: {
          status: DriverStatus.ACTIVE,
          vehicleType:
            dto.vehicleType !== undefined
              ? dto.vehicleType?.trim() || null
              : undefined,
          vehicleNumber:
            dto.vehicleNumber !== undefined
              ? dto.vehicleNumber?.trim() || null
              : undefined,
          licenseNumber:
            dto.licenseNumber !== undefined
              ? dto.licenseNumber?.trim() || null
              : undefined,
        },
        include: {
          user: {
            select: { id: true, name: true, phone: true, email: true },
          },
        },
      });

      // 3. Write Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "DRIVER_ACTIVATED",
          entity: "DriverProfile",
          entityId: profile.id,
          metadata: {
            targetUserId: targetUser.id,
            status: DriverStatus.ACTIVE,
            vehicleType: dto.vehicleType,
            vehicleNumber: dto.vehicleNumber,
          },
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      return profile;
    });

    this.logger.log(`User ${targetUser.id} activated as driver by admin ${adminUserId}`);
    return this.mapDriverProfile(result);
  }

  /**
   * Update driver status (e.g. SUSPEND or ACTIVATE) with explicit audit trail.
   */
  async updateDriverStatus(
    driverId: string,
    dto: UpdateDriverStatusDto,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<DriverProfileSummary> {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { id: driverId },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException(`Driver profile with ID ${driverId} not found.`);
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // If suspended, force availability to OFFLINE
      const availabilityUpdate =
        dto.status === DriverStatus.SUSPENDED
          ? DriverAvailability.OFFLINE
          : undefined;

      const res = await tx.driverProfile.update({
        where: { id: driverId },
        data: {
          status: dto.status,
          ...(availabilityUpdate && { availability: availabilityUpdate }),
        },
        include: {
          user: { select: { id: true, name: true, phone: true, email: true } },
        },
      });

      // Audit log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "DRIVER_STATUS_UPDATED",
          entity: "DriverProfile",
          entityId: driverId,
          metadata: {
            previousStatus: profile.status,
            newStatus: dto.status,
            reason: dto.reason || null,
          },
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      return res;
    });

    this.logger.log(
      `Driver ${driverId} status updated to ${dto.status} by admin ${adminUserId}`,
    );
    return this.mapDriverProfile(updated);
  }

  /**
   * List all drivers with their profile, status, availability, and active delivery stats.
   */
  async listDrivers(filter?: { status?: DriverStatus; availability?: DriverAvailability }) {
    const where: any = {};
    if (filter?.status) where.status = filter.status;
    if (filter?.availability) where.availability = filter.availability;

    const drivers = await this.prisma.driverProfile.findMany({
      where,
      include: {
        user: {
          select: { id: true, name: true, phone: true, email: true, isActive: true },
        },
        assignments: {
          where: {
            status: {
              in: [
                DeliveryStatus.ASSIGNED,
                DeliveryStatus.ACCEPTED,
                DeliveryStatus.PICKED_UP,
                DeliveryStatus.OUT_FOR_DELIVERY,
              ],
            },
          },
          include: {
            order: {
              select: { id: true, orderNumber: true, totalAmount: true },
            },
          },
          take: 1,
        },
      },
      orderBy: [{ status: "asc" }, { updatedAt: "desc" }],
    });

    return drivers.map((d) => ({
      ...this.mapDriverProfile(d),
      activeDelivery: d.assignments[0]
        ? {
            id: d.assignments[0].id,
            orderId: d.assignments[0].orderId,
            orderNumber: d.assignments[0].order.orderNumber,
            driverId: d.id,
            status: d.assignments[0].status,
            assignedAt: d.assignments[0].assignedAt.toISOString(),
            estimatedDurationMin: d.assignments[0].estimatedDurationMin,
            estimatedDistanceKm: d.assignments[0].estimatedDistanceKm,
          }
        : null,
    }));
  }

  /**
   * Assign an active driver to an order atomically.
   */
  async assignDriverToOrder(
    dto: AssignDriverDto,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const order = await this.prisma.order.findUnique({
      where: { id: dto.orderId },
      include: { deliveryAssignment: true },
    });

    if (!order) {
      throw new NotFoundException(`Order with ID ${dto.orderId} not found.`);
    }

    if (order.status === OrderStatus.CANCELLED || order.status === OrderStatus.DELIVERED) {
      throw new BadRequestException(
        `Cannot assign driver to an order that is ${order.status}.`,
      );
    }

    const driver = await this.prisma.driverProfile.findUnique({
      where: { id: dto.driverId },
      include: {
        user: { select: { id: true, name: true, phone: true } },
      },
    });

    if (!driver) {
      throw new NotFoundException(`Driver with ID ${dto.driverId} not found.`);
    }

    if (driver.status !== DriverStatus.ACTIVE) {
      throw new BadRequestException(
        `Cannot assign order to driver: Driver status is ${driver.status}. Only ACTIVE drivers can be assigned.`,
      );
    }

    // Determine destination coordinates
    const customerLat = order.deliveryLatitude || RESTAURANT_COORDINATES.latitude + 0.015;
    const customerLng = order.deliveryLongitude || RESTAURANT_COORDINATES.longitude + 0.015;

    // Calculate real road route from restaurant to customer
    const route = await this.routingService.calculateRoute(RESTAURANT_COORDINATES, {
      latitude: customerLat,
      longitude: customerLng,
    });

    const result = await this.prisma.$transaction(async (tx) => {
      // 1. Upsert Delivery Assignment (orderId is unique, atomically preventing duplicate assignment)
      const assignment = await tx.deliveryAssignment.upsert({
        where: { orderId: order.id },
        create: {
          orderId: order.id,
          driverId: driver.id,
          status: DeliveryStatus.ASSIGNED,
          estimatedDurationMin: route.durationMin,
          estimatedDistanceKm: route.distanceKm,
          routePolyline: JSON.stringify(route.coordinates),
        },
        update: {
          driverId: driver.id,
          status: DeliveryStatus.ASSIGNED,
          assignedAt: new Date(),
          acceptedAt: null,
          pickedUpAt: null,
          deliveredAt: null,
          cancelledAt: null,
          estimatedDurationMin: route.durationMin,
          estimatedDistanceKm: route.distanceKm,
          routePolyline: JSON.stringify(route.coordinates),
        },
        include: {
          order: true,
          driver: {
            include: {
              user: { select: { id: true, name: true, phone: true } },
            },
          },
        },
      });

      // 2. Record status history
      await tx.deliveryStatusHistory.create({
        data: {
          assignmentId: assignment.id,
          status: DeliveryStatus.ASSIGNED,
          notes: dto.notes || `Assigned to driver ${driver.user.name || driver.id} by admin`,
          changedById: adminUserId,
        },
      });

      // 3. Update driver availability to BUSY
      await tx.driverProfile.update({
        where: { id: driver.id },
        data: { availability: DriverAvailability.BUSY },
      });

      // 4. Record Audit Log
      await tx.auditLog.create({
        data: {
          userId: adminUserId,
          action: "DRIVER_ASSIGNED",
          entity: "DeliveryAssignment",
          entityId: assignment.id,
          metadata: {
            orderId: order.id,
            orderNumber: order.orderNumber,
            driverId: driver.id,
            estimatedDurationMin: route.durationMin,
            estimatedDistanceKm: route.distanceKm,
          },
          ipAddress: ipAddress || null,
          userAgent: userAgent || null,
        },
      });

      return assignment;
    });

    // Broadcast assignment via real-time gateway
    this.deliveryGateway.broadcastDriverAssigned(order.id, driver.id, {
      assignmentId: result.id,
      orderId: order.id,
      orderNumber: order.orderNumber,
      driver: {
        id: driver.id,
        name: driver.user.name,
        phone: driver.user.phone,
        vehicleType: driver.vehicleType,
        vehicleNumber: driver.vehicleNumber,
      },
      estimatedDurationMin: route.durationMin,
      estimatedDistanceKm: route.distanceKm,
    });

    this.logger.log(`Order ${order.orderNumber} assigned to driver ${driver.id}`);
    return result;
  }

  /**
   * Reassign delivery to a different driver with audit reason.
   */
  async reassignDriver(
    dto: ReassignDriverDto,
    adminUserId: string,
    ipAddress?: string,
    userAgent?: string,
  ) {
    const existingAssignment = await this.prisma.deliveryAssignment.findUnique({
      where: { orderId: dto.orderId },
      include: { driver: true },
    });

    if (existingAssignment) {
      // Free old driver if they have no other active deliveries
      await this.prisma.driverProfile.update({
        where: { id: existingAssignment.driverId },
        data: { availability: DriverAvailability.ONLINE },
      });

      // Record cancellation in history
      await this.prisma.deliveryStatusHistory.create({
        data: {
          assignmentId: existingAssignment.id,
          status: DeliveryStatus.CANCELLED,
          notes: `Reassigned by admin: ${dto.reason}`,
          changedById: adminUserId,
        },
      });
    }

    return this.assignDriverToOrder(
      {
        orderId: dto.orderId,
        driverId: dto.newDriverId,
        notes: `Reassigned from previous driver: ${dto.reason}`,
      },
      adminUserId,
      ipAddress,
      userAgent,
    );
  }

  /**
   * Admin: List all active deliveries.
   */
  async getActiveDeliveriesAdmin() {
    const assignments = await this.prisma.deliveryAssignment.findMany({
      where: {
        status: {
          in: [
            DeliveryStatus.ASSIGNED,
            DeliveryStatus.ACCEPTED,
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.OUT_FOR_DELIVERY,
          ],
        },
      },
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customerName: true,
            customerPhone: true,
            deliveryAddress: true,
            landmark: true,
            deliveryLatitude: true,
            deliveryLongitude: true,
            status: true,
            totalAmount: true,
            createdAt: true,
          },
        },
        driver: {
          include: {
            user: { select: { id: true, name: true, phone: true } },
          },
        },
      },
      orderBy: { updatedAt: "desc" },
    });

    return assignments.map((a) => ({
      id: a.id,
      orderId: a.orderId,
      orderNumber: a.order.orderNumber,
      orderStatus: a.order.status,
      deliveryStatus: a.status,
      customer: {
        name: a.order.customerName,
        phone: a.order.customerPhone,
        address: a.order.deliveryAddress,
        landmark: a.order.landmark,
        latitude: a.order.deliveryLatitude,
        longitude: a.order.deliveryLongitude,
      },
      driver: {
        id: a.driver.id,
        name: a.driver.user.name,
        phone: a.driver.user.phone,
        vehicleType: a.driver.vehicleType,
        vehicleNumber: a.driver.vehicleNumber,
        currentLatitude: a.driver.currentLatitude,
        currentLongitude: a.driver.currentLongitude,
        currentHeading: a.driver.currentHeading,
        currentSpeed: a.driver.currentSpeed,
        lastLocationUpdate: a.driver.lastLocationUpdate?.toISOString() || null,
      },
      estimatedDurationMin: a.estimatedDurationMin,
      estimatedDistanceKm: a.estimatedDistanceKm,
      assignedAt: a.assignedAt.toISOString(),
      acceptedAt: a.acceptedAt?.toISOString() || null,
      pickedUpAt: a.pickedUpAt?.toISOString() || null,
    }));
  }

  // ---------------------------------------------------------------------------
  // Driver Operations
  // ---------------------------------------------------------------------------

  /**
   * Authoritative driver profile check for logged-in user.
   */
  async getDriverProfile(userId: string): Promise<DriverProfileSummary> {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    if (!profile) {
      throw new NotFoundException("Driver profile not found for this user.");
    }

    if (profile.status === DriverStatus.SUSPENDED) {
      throw new ForbiddenException("Your driver account is suspended. Contact administration.");
    }

    return this.mapDriverProfile(profile);
  }

  /**
   * Update driver availability (ONLINE, OFFLINE, BUSY).
   */
  async updateAvailability(userId: string, availability: DriverAvailability) {
    const profile = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!profile) {
      throw new NotFoundException("Driver profile not found.");
    }

    if (profile.status === DriverStatus.SUSPENDED) {
      throw new ForbiddenException("Suspended drivers cannot change availability.");
    }

    if (profile.status === DriverStatus.PENDING) {
      throw new ForbiddenException("Driver activation is pending administrator approval.");
    }

    const updated = await this.prisma.driverProfile.update({
      where: { id: profile.id },
      data: { availability },
      include: {
        user: { select: { id: true, name: true, phone: true, email: true } },
      },
    });

    this.logger.log(`Driver ${profile.id} set availability to ${availability}`);
    return this.mapDriverProfile(updated);
  }

  /**
   * Get driver's current active delivery assignment (if any).
   */
  async getMyActiveDelivery(userId: string) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!driver) {
      throw new NotFoundException("Driver profile not found.");
    }

    if (driver.status === DriverStatus.SUSPENDED) {
      throw new ForbiddenException("Driver account is suspended.");
    }

    const assignment = await this.prisma.deliveryAssignment.findFirst({
      where: {
        driverId: driver.id,
        status: {
          in: [
            DeliveryStatus.ASSIGNED,
            DeliveryStatus.ACCEPTED,
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.OUT_FOR_DELIVERY,
          ],
        },
      },
      include: {
        order: {
          include: {
            items: true,
          },
        },
        statusHistory: {
          orderBy: { createdAt: "desc" },
        },
      },
    });

    if (!assignment) {
      return null;
    }

    let routeCoordinates: [number, number][] = [];
    if (assignment.routePolyline) {
      try {
        routeCoordinates = JSON.parse(assignment.routePolyline);
      } catch {
        routeCoordinates = [];
      }
    }

    return {
      assignmentId: assignment.id,
      deliveryStatus: assignment.status,
      assignedAt: assignment.assignedAt.toISOString(),
      acceptedAt: assignment.acceptedAt?.toISOString() || null,
      pickedUpAt: assignment.pickedUpAt?.toISOString() || null,
      estimatedDurationMin: assignment.estimatedDurationMin,
      estimatedDistanceKm: assignment.estimatedDistanceKm,
      routeCoordinates,
      order: {
        id: assignment.order.id,
        orderNumber: assignment.order.orderNumber,
        status: assignment.order.status,
        customerName: assignment.order.customerName,
        customerPhone: assignment.order.customerPhone,
        deliveryAddress: assignment.order.deliveryAddress,
        landmark: assignment.order.landmark,
        city: assignment.order.city,
        pincode: assignment.order.pincode,
        deliveryLatitude: assignment.order.deliveryLatitude,
        deliveryLongitude: assignment.order.deliveryLongitude,
        paymentStatus: assignment.order.paymentStatus,
        paymentMethod: assignment.order.paymentMethod,
        totalAmount: Number(assignment.order.totalAmount),
        notes: assignment.order.notes,
        items: assignment.order.items.map((i) => ({
          productName: i.productName,
          portion: i.portion,
          quantity: i.quantity,
          customization: i.customization,
        })),
      },
      restaurant: RESTAURANT_DETAILS,
    };
  }

  /**
   * Transition delivery assignment status:
   * ASSIGNED -> ACCEPTED -> PICKED_UP -> OUT_FOR_DELIVERY -> DELIVERED
   */
  async transitionDeliveryStatus(
    userId: string,
    assignmentId: string,
    newStatus: DeliveryStatus,
    notes?: string,
    cancellationReason?: string,
  ) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!driver || driver.status !== DriverStatus.ACTIVE) {
      throw new ForbiddenException("Active driver profile required.");
    }

    const assignment = await this.prisma.deliveryAssignment.findUnique({
      where: { id: assignmentId },
      include: { order: true },
    });

    if (!assignment) {
      throw new NotFoundException("Delivery assignment not found.");
    }

    if (assignment.driverId !== driver.id) {
      throw new ForbiddenException("You are not assigned to this delivery.");
    }

    // State machine validation
    const validTransitions: Record<DeliveryStatus, DeliveryStatus[]> = {
      [DeliveryStatus.ASSIGNED]: [DeliveryStatus.ACCEPTED, DeliveryStatus.CANCELLED],
      [DeliveryStatus.ACCEPTED]: [DeliveryStatus.PICKED_UP, DeliveryStatus.CANCELLED],
      [DeliveryStatus.PICKED_UP]: [DeliveryStatus.OUT_FOR_DELIVERY, DeliveryStatus.CANCELLED],
      [DeliveryStatus.OUT_FOR_DELIVERY]: [DeliveryStatus.DELIVERED, DeliveryStatus.CANCELLED],
      [DeliveryStatus.DELIVERED]: [],
      [DeliveryStatus.CANCELLED]: [],
    };

    const allowed = validTransitions[assignment.status] || [];
    if (!allowed.includes(newStatus)) {
      throw new BadRequestException(
        `Invalid status transition from ${assignment.status} to ${newStatus}. Allowed next states: ${allowed.join(", ") || "None"}`,
      );
    }

    const now = new Date();
    const updateData: any = { status: newStatus };
    let orderStatusUpdate: OrderStatus | undefined;

    if (newStatus === DeliveryStatus.ACCEPTED) {
      updateData.acceptedAt = now;
    } else if (newStatus === DeliveryStatus.PICKED_UP) {
      updateData.pickedUpAt = now;
      orderStatusUpdate = OrderStatus.OUT_FOR_DELIVERY;
    } else if (newStatus === DeliveryStatus.OUT_FOR_DELIVERY) {
      orderStatusUpdate = OrderStatus.OUT_FOR_DELIVERY;
    } else if (newStatus === DeliveryStatus.DELIVERED) {
      updateData.deliveredAt = now;
      orderStatusUpdate = OrderStatus.DELIVERED;
    } else if (newStatus === DeliveryStatus.CANCELLED) {
      updateData.cancelledAt = now;
      updateData.cancellationReason = cancellationReason || notes || "Cancelled by driver";
    }

    const updated = await this.prisma.$transaction(async (tx) => {
      // 1. Update assignment
      const res = await tx.deliveryAssignment.update({
        where: { id: assignment.id },
        data: updateData,
        include: { order: true },
      });

      // 2. Synchronize order status if applicable
      if (orderStatusUpdate) {
        await tx.order.update({
          where: { id: assignment.orderId },
          data: { status: orderStatusUpdate },
        });
      }

      // 3. If delivered or cancelled, set driver availability back to ONLINE
      if (newStatus === DeliveryStatus.DELIVERED || newStatus === DeliveryStatus.CANCELLED) {
        await tx.driverProfile.update({
          where: { id: driver.id },
          data: { availability: DriverAvailability.ONLINE },
        });
      }

      // 4. Record history
      await tx.deliveryStatusHistory.create({
        data: {
          assignmentId: assignment.id,
          status: newStatus,
          notes: notes || `Driver transitioned status to ${newStatus}`,
          changedById: userId,
        },
      });

      // 5. Audit Log
      await tx.auditLog.create({
        data: {
          userId,
          action: `DELIVERY_${newStatus}`,
          entity: "DeliveryAssignment",
          entityId: assignment.id,
          metadata: {
            orderId: assignment.orderId,
            previousStatus: assignment.status,
            newStatus,
            orderStatus: orderStatusUpdate || assignment.order.status,
          },
        },
      });

      return res;
    });

    // Broadcast status change via WebSocket
    this.deliveryGateway.broadcastStatusChange(assignment.orderId, driver.id, {
      status: newStatus,
      orderStatus: orderStatusUpdate || assignment.order.status,
      updatedAt: now.toISOString(),
      notes,
    });

    this.logger.log(
      `Delivery ${assignment.id} for order ${assignment.orderId} moved to ${newStatus}`,
    );

    return updated;
  }

  /**
   * Ingest and validate live driver GPS location update.
   */
  async recordDriverLocation(userId: string, dto: RecordLocationDto) {
    const driver = await this.prisma.driverProfile.findUnique({
      where: { userId },
    });

    if (!driver || driver.status !== DriverStatus.ACTIVE) {
      throw new ForbiddenException("Active driver status required to report location.");
    }

    // Accuracy validation: must be within 100 meters
    if (dto.accuracy !== undefined && dto.accuracy !== null && dto.accuracy > 100) {
      throw new BadRequestException(
        `Location rejected: Accuracy of ${dto.accuracy}m exceeds maximum allowed threshold of 100m.`,
      );
    }

    // Freshness validation: if timestamp provided, reject if older than 60s or > 10s in future
    if (dto.timestamp) {
      const nowMs = Date.now();
      const ageMs = nowMs - dto.timestamp;
      if (ageMs > 60000) {
        throw new BadRequestException(
          `Location rejected: Stale timestamp (${Math.round(ageMs / 1000)}s old). Must be < 60s.`,
        );
      }
      if (ageMs < -10000) {
        throw new BadRequestException(
          "Location rejected: Timestamp is in the future.",
        );
      }
    }

    const now = new Date();

    // Find active assignment if any
    const activeAssignment = await this.prisma.deliveryAssignment.findFirst({
      where: {
        driverId: driver.id,
        status: {
          in: [
            DeliveryStatus.ACCEPTED,
            DeliveryStatus.PICKED_UP,
            DeliveryStatus.OUT_FOR_DELIVERY,
          ],
        },
      },
      include: {
        order: {
          select: {
            deliveryLatitude: true,
            deliveryLongitude: true,
          },
        },
      },
    });

    // Update driver coordinates & history in parallel
    const [updatedDriver] = await Promise.all([
      this.prisma.driverProfile.update({
        where: { id: driver.id },
        data: {
          currentLatitude: dto.latitude,
          currentLongitude: dto.longitude,
          currentHeading: dto.heading ?? null,
          currentSpeed: dto.speed ?? null,
          lastLocationUpdate: now,
        },
      }),
      this.prisma.deliveryLocationHistory.create({
        data: {
          driverId: driver.id,
          assignmentId: activeAssignment?.id || null,
          latitude: dto.latitude,
          longitude: dto.longitude,
          heading: dto.heading ?? null,
          speed: dto.speed ?? null,
          accuracy: dto.accuracy ?? null,
          recordedAt: now,
        },
      }),
    ]);

    // Calculate dynamic ETA to customer if active delivery exists
    let estimatedDurationMin = activeAssignment?.estimatedDurationMin || null;
    let estimatedDistanceKm = activeAssignment?.estimatedDistanceKm || null;

    if (activeAssignment?.order.deliveryLatitude && activeAssignment?.order.deliveryLongitude) {
      try {
        const remainingRoute = await this.routingService.calculateRoute(
          { latitude: dto.latitude, longitude: dto.longitude },
          {
            latitude: activeAssignment.order.deliveryLatitude,
            longitude: activeAssignment.order.deliveryLongitude,
          },
        );
        estimatedDurationMin = remainingRoute.durationMin;
        estimatedDistanceKm = remainingRoute.distanceKm;

        // Save updated estimate on assignment asynchronously
        this.prisma.deliveryAssignment
          .update({
            where: { id: activeAssignment.id },
            data: {
              estimatedDurationMin,
              estimatedDistanceKm,
            },
          })
          .catch(() => {});
      } catch (e: any) {
        this.logger.warn(`Failed to update route estimate: ${e.message}`);
      }
    }

    // Broadcast location update
    this.deliveryGateway.broadcastLocationUpdate(
      activeAssignment?.orderId || null,
      driver.id,
      {
        latitude: dto.latitude,
        longitude: dto.longitude,
        heading: dto.heading ?? null,
        speed: dto.speed ?? null,
        accuracy: dto.accuracy ?? null,
        updatedAt: now.toISOString(),
        estimatedDurationMin,
        estimatedDistanceKm,
      },
    );

    return {
      success: true,
      latitude: dto.latitude,
      longitude: dto.longitude,
      estimatedDurationMin,
      estimatedDistanceKm,
      updatedAt: now.toISOString(),
    };
  }

  // ---------------------------------------------------------------------------
  // Customer Live Tracking
  // ---------------------------------------------------------------------------

  /**
   * Authoritative live tracking information for customer order.
   * Enforces cross-customer isolation.
   */
  async getDeliveryTracking(
    orderId: string,
    requestingUserId?: string,
    userRole?: UserRole,
  ): Promise<DeliveryTrackingResponse> {
    const order = await this.prisma.order.findUnique({
      where: { id: orderId },
      include: {
        deliveryAssignment: {
          include: {
            driver: {
              include: {
                user: { select: { id: true, name: true, phone: true } },
              },
            },
            statusHistory: {
              orderBy: { createdAt: "desc" },
            },
          },
        },
      },
    });

    if (!order) {
      throw new NotFoundException(`Order ${orderId} not found.`);
    }

    // Authorization check
    if (requestingUserId) {
      const isOwner = order.userId === requestingUserId;
      const isDriver = order.deliveryAssignment?.driver?.userId === requestingUserId;
      const isAdmin = userRole === UserRole.ADMIN || userRole === UserRole.STAFF;

      if (!isOwner && !isDriver && !isAdmin) {
        throw new ForbiddenException(
          "Access denied: You are not authorized to view tracking for this order.",
        );
      }
    }

    const assignment = order.deliveryAssignment;
    const driver = assignment?.driver;

    let routeCoordinates: [number, number][] = [];
    if (assignment?.routePolyline) {
      try {
        routeCoordinates = JSON.parse(assignment.routePolyline);
      } catch {
        routeCoordinates = [];
      }
    }

    // Check if location is stale (older than 60s or not updated yet)
    let isStale = false;
    if (driver?.lastLocationUpdate) {
      const diffMs = Date.now() - new Date(driver.lastLocationUpdate).getTime();
      if (diffMs > 60000) {
        isStale = true;
      }
    } else if (assignment?.status === DeliveryStatus.OUT_FOR_DELIVERY) {
      isStale = true;
    }

    return {
      orderId: order.id,
      orderNumber: order.orderNumber,
      orderStatus: order.status,
      deliveryStatus: assignment?.status || null,
      driver: driver
        ? {
            id: driver.id,
            name: driver.user.name,
            phone: driver.user.phone,
            vehicleType: driver.vehicleType,
            vehicleNumber: driver.vehicleNumber,
          }
        : null,
      driverLocation:
        driver && driver.currentLatitude !== null && driver.currentLongitude !== null
          ? {
              latitude: driver.currentLatitude,
              longitude: driver.currentLongitude,
              heading: driver.currentHeading,
              speed: driver.currentSpeed,
              updatedAt: driver.lastLocationUpdate?.toISOString() || null,
            }
          : null,
      restaurantLocation: RESTAURANT_DETAILS,
      customerLocation: {
        latitude: order.deliveryLatitude,
        longitude: order.deliveryLongitude,
        address: order.deliveryAddress,
        landmark: order.landmark,
        recipientName: order.customerName,
        phone: order.customerPhone,
      },
      routeCoordinates,
      estimatedDurationMin: assignment?.estimatedDurationMin || null,
      estimatedDistanceKm: assignment?.estimatedDistanceKm || null,
      statusHistory: (assignment?.statusHistory || []).map((h) => ({
        status: h.status,
        notes: h.notes,
        createdAt: h.createdAt.toISOString(),
      })),
      isStale,
    };
  }

  // ---------------------------------------------------------------------------
  // Helper Mappers
  // ---------------------------------------------------------------------------

  private mapDriverProfile(profile: any): DriverProfileSummary {
    return {
      id: profile.id,
      userId: profile.userId,
      status: profile.status,
      availability: profile.availability,
      vehicleType: profile.vehicleType || null,
      vehicleNumber: profile.vehicleNumber || null,
      licenseNumber: profile.licenseNumber || null,
      currentLatitude: profile.currentLatitude !== null ? Number(profile.currentLatitude) : null,
      currentLongitude: profile.currentLongitude !== null ? Number(profile.currentLongitude) : null,
      currentHeading: profile.currentHeading !== null ? Number(profile.currentHeading) : null,
      currentSpeed: profile.currentSpeed !== null ? Number(profile.currentSpeed) : null,
      lastLocationUpdate: profile.lastLocationUpdate
        ? profile.lastLocationUpdate instanceof Date
          ? profile.lastLocationUpdate.toISOString()
          : profile.lastLocationUpdate
        : null,
      user: {
        id: profile.user.id,
        name: profile.user.name || null,
        phone: profile.user.phone || null,
        email: profile.user.email || null,
      },
    };
  }
}
