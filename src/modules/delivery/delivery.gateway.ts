import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from "@nestjs/websockets";
import { Server, Socket } from "socket.io";
import { Logger, Inject, forwardRef } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import * as crypto from "crypto";
import { UserRole } from "../../types";
import { DeliveryService } from "./delivery.service";
import { RecordLocationDto } from "./dto/record-location.dto";

interface AuthenticatedSocket extends Socket {
  data: {
    user?: {
      id: string;
      name: string | null;
      phone: string | null;
      role: UserRole;
    };
  };
}

@WebSocketGateway({
  namespace: "/delivery",
  cors: {
    origin: "*",
    credentials: true,
  },
})
export class DeliveryGateway
  implements OnGatewayConnection, OnGatewayDisconnect
{
  @WebSocketServer()
  server!: Server;

  private readonly logger = new Logger(DeliveryGateway.name);

  constructor(
    private readonly prisma: PrismaService,
    @Inject(forwardRef(() => DeliveryService))
    private readonly deliveryService: DeliveryService,
  ) {}

  async handleConnection(client: AuthenticatedSocket) {
    try {
      const token = this.extractTokenFromSocket(client);
      if (!token) {
        this.logger.warn(`Unauthorized socket connection attempt: ${client.id}`);
        client.disconnect(true);
        return;
      }

      const tokenHash = crypto.createHash("sha256").update(token).digest("hex");
      const session = await this.prisma.session.findUnique({
        where: { tokenHash },
        include: { user: true },
      });

      if (!session || session.expiresAt < new Date() || !session.user || !session.user.isActive) {
        this.logger.warn(`Invalid or expired session for socket: ${client.id}`);
        client.disconnect(true);
        return;
      }

      client.data.user = {
        id: session.user.id,
        name: session.user.name,
        phone: session.user.phone,
        role: session.user.role as UserRole,
      };

      this.logger.log(
        `Socket connected: ${client.id} (User: ${session.user.id}, Role: ${session.user.role})`,
      );
    } catch (err: any) {
      this.logger.error(`Error in handleConnection: ${err.message}`);
      client.disconnect(true);
    }
  }

  handleDisconnect(client: AuthenticatedSocket) {
    this.logger.log(`Socket disconnected: ${client.id}`);
  }

  @SubscribeMessage("join_order")
  async handleJoinOrder(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { orderId: string },
  ) {
    const user = client.data.user;
    if (!user || !data?.orderId) {
      return { success: false, message: "Unauthorized or missing orderId" };
    }

    // Verify order authorization
    const order = await this.prisma.order.findUnique({
      where: { id: data.orderId },
      include: { deliveryAssignment: { include: { driver: true } } },
    });

    if (!order) {
      return { success: false, message: "Order not found" };
    }

    const isCustomerOwner = order.userId === user.id;
    const isAssignedDriver = order.deliveryAssignment?.driver?.userId === user.id;
    const isAdminOrStaff =
      user.role === UserRole.ADMIN ||
      user.role === UserRole.STAFF ||
      user.role === UserRole.KITCHEN;

    if (!isCustomerOwner && !isAssignedDriver && !isAdminOrStaff) {
      return { success: false, message: "Forbidden: Cannot access this order room" };
    }

    const room = `order:${data.orderId}`;
    await client.join(room);
    this.logger.log(`User ${user.id} joined room ${room}`);
    return { success: true, room };
  }

  @SubscribeMessage("join_driver")
  async handleJoinDriver(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() data: { driverId?: string },
  ) {
    const user = client.data.user;
    if (!user) {
      return { success: false, message: "Unauthorized" };
    }

    const driverProfile = await this.prisma.driverProfile.findUnique({
      where: { userId: user.id },
    });

    if (!driverProfile) {
      return { success: false, message: "Driver profile not found" };
    }

    const room = `driver:${driverProfile.id}`;
    await client.join(room);
    this.logger.log(`Driver ${driverProfile.id} joined room ${room}`);
    return { success: true, room };
  }

  @SubscribeMessage("join_admin")
  async handleJoinAdmin(@ConnectedSocket() client: AuthenticatedSocket) {
    const user = client.data.user;
    if (!user || (user.role !== UserRole.ADMIN && user.role !== UserRole.STAFF)) {
      return { success: false, message: "Forbidden: Admin privileges required" };
    }

    const room = "admin:delivery";
    await client.join(room);
    this.logger.log(`Admin user ${user.id} joined room ${room}`);
    return { success: true, room };
  }

  @SubscribeMessage("location_update")
  async handleLocationUpdate(
    @ConnectedSocket() client: AuthenticatedSocket,
    @MessageBody() payload: RecordLocationDto,
  ) {
    const user = client.data.user;
    if (!user) {
      return { success: false, message: "Unauthorized" };
    }

    try {
      const result = await this.deliveryService.recordDriverLocation(user.id, payload);
      return { success: true, data: result };
    } catch (err: any) {
      return { success: false, message: err.message };
    }
  }

  // --- Broadcast Methods (Called by DeliveryService) ---

  broadcastLocationUpdate(
    orderId: string | null,
    driverId: string,
    payload: {
      latitude: number;
      longitude: number;
      heading?: number | null;
      speed?: number | null;
      accuracy?: number | null;
      updatedAt: string;
      estimatedDurationMin?: number | null;
      estimatedDistanceKm?: number | null;
    },
  ) {
    if (orderId) {
      this.server.to(`order:${orderId}`).emit("delivery:location", {
        orderId,
        driverId,
        ...payload,
      });
    }
    // Also broadcast to admin room
    this.server.to("admin:delivery").emit("admin:driver_location", {
      orderId,
      driverId,
      ...payload,
    });
  }

  broadcastStatusChange(
    orderId: string,
    driverId: string,
    payload: {
      status: string;
      orderStatus: string;
      updatedAt: string;
      notes?: string | null;
    },
  ) {
    this.server.to(`order:${orderId}`).emit("delivery:status", {
      orderId,
      driverId,
      ...payload,
    });
    this.server.to(`driver:${driverId}`).emit("delivery:status", {
      orderId,
      driverId,
      ...payload,
    });
    this.server.to("admin:delivery").emit("admin:delivery_status", {
      orderId,
      driverId,
      ...payload,
    });
  }

  broadcastDriverAssigned(
    orderId: string,
    driverId: string,
    payload: any,
  ) {
    this.server.to(`order:${orderId}`).emit("delivery:assigned", payload);
    this.server.to(`driver:${driverId}`).emit("delivery:new_assignment", payload);
    this.server.to("admin:delivery").emit("admin:delivery_assigned", payload);
  }

  private extractTokenFromSocket(client: Socket): string | null {
    // 1. Check handshake auth token
    if (client.handshake.auth?.token) {
      return client.handshake.auth.token;
    }
    // 2. Check Authorization Bearer header
    const authHeader = client.handshake.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      return authHeader.substring(7);
    }
    // 3. Check cookies
    const cookieHeader = client.handshake.headers.cookie;
    if (cookieHeader) {
      const match = cookieHeader.match(/fvd_session=([^;]+)/);
      if (match && match[1]) {
        return decodeURIComponent(match[1]);
      }
    }
    return null;
  }
}
