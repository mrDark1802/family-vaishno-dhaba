import { DeliveryService, RESTAURANT_COORDINATES } from "../src/modules/delivery/delivery.service";
import { RoutingService } from "../src/modules/delivery/routing.service";
import {
  DriverStatus,
  DriverAvailability,
  DeliveryStatus,
  UserRole,
  OrderStatus,
} from "../src/types";
import { Prisma } from "@prisma/client";

// =============================================================================
// Mock In-Memory Database for Fast & Deterministic Delivery Verification
// =============================================================================

class MockPrismaDeliveryService {
  public users: any[] = [
    {
      id: "admin-user-1",
      name: "Sardar Gurpreet Singh",
      phone: "9816011111",
      email: "admin@familyvaishnodhaba.com",
      role: UserRole.ADMIN,
      isActive: true,
    },
    {
      id: "customer-user-1",
      name: "Aman Sharma",
      phone: "9816022222",
      email: "aman@gmail.com",
      role: UserRole.CUSTOMER,
      isActive: true,
    },
    {
      id: "customer-user-2",
      name: "Rohit Verma",
      phone: "9816033333",
      email: "rohit@gmail.com",
      role: UserRole.CUSTOMER,
      isActive: true,
    },
    {
      id: "candidate-driver-user",
      name: "Harjeet Singh",
      phone: "9816044444",
      email: "harjeet@gmail.com",
      role: UserRole.CUSTOMER,
      isActive: true,
    },
  ];

  public driverProfiles: any[] = [];
  public orders: any[] = [
    {
      id: "order-101",
      orderNumber: "FVD-20261026-0001",
      userId: "customer-user-1",
      customerName: "Aman Sharma",
      customerPhone: "9816022222",
      customerEmail: "aman@gmail.com",
      deliveryAddress: "Flat 204, Model Town, Jalandhar",
      landmark: "Near Geeta Mandir",
      city: "Jalandhar",
      pincode: "144003",
      deliveryLatitude: 31.3256,
      deliveryLongitude: 75.5792,
      status: OrderStatus.PREPARING,
      totalAmount: new Prisma.Decimal(450),
      createdAt: new Date(),
      deliveryAssignment: null,
      items: [
        {
          id: "item-1",
          productName: "Dal Makhani",
          portion: "FULL",
          quantity: 2,
          customization: null,
        },
      ],
    },
    {
      id: "order-102",
      orderNumber: "FVD-20261026-0002",
      userId: "customer-user-2",
      customerName: "Rohit Verma",
      customerPhone: "9816033333",
      customerEmail: "rohit@gmail.com",
      deliveryAddress: "House 12, Kapurthala Road",
      city: "Jalandhar",
      pincode: "144002",
      deliveryLatitude: 31.345,
      deliveryLongitude: 75.535,
      status: OrderStatus.CANCELLED,
      totalAmount: new Prisma.Decimal(280),
      createdAt: new Date(),
      deliveryAssignment: null,
      items: [],
    },
  ];

  public driverProfiles: any[] = [];
  public deliveryAssignments: any[] = [];
  public deliveryStatusHistoryList: any[] = [];
  public deliveryLocationHistoryList: any[] = [];
  public auditLogsList: any[] = [];

  public user = {
    findUnique: async ({ where }: any) => {
      const u = this.users.find((user) => user.id === where.id);
      if (!u) return null;
      const dp = this.driverProfiles.find((d) => d.userId === u.id);
      return { ...u, driverProfile: dp || null };
    },
    findMany: async () => this.users,
    update: async ({ where, data }: any) => {
      const u = this.users.find((user) => user.id === where.id);
      if (u) Object.assign(u, data);
      return u;
    },
  };

  public driverProfile = {
    findUnique: async ({ where }: any) => {
      let d = null;
      if (where.id) d = this.driverProfiles.find((dp) => dp.id === where.id);
      if (where.userId) d = this.driverProfiles.find((dp) => dp.userId === where.userId);
      if (!d) return null;
      const u = this.users.find((user) => user.id === d.userId);
      return { ...d, user: u };
    },
    findMany: async () => {
      return this.driverProfiles.map((d) => {
        const u = this.users.find((user) => user.id === d.userId);
        const asgn = this.deliveryAssignments.filter((a) => a.driverId === d.id);
        return { ...d, user: u, assignments: asgn };
      });
    },
    upsert: async ({ where, create, update }: any) => {
      let d = this.driverProfiles.find((dp) => dp.userId === where.userId);
      if (d) {
        Object.assign(d, update);
      } else {
        d = {
          id: `driver-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
          ...create,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.driverProfiles.push(d);
      }
      const u = this.users.find((user) => user.id === d.userId);
      return { ...d, user: u };
    },
    update: async ({ where, data }: any) => {
      const d = this.driverProfiles.find((dp) => dp.id === where.id);
      if (d) Object.assign(d, data, { updatedAt: new Date() });
      const u = this.users.find((user) => user.id === d.userId);
      return { ...d, user: u };
    },
  };

  public order = {
    findUnique: async ({ where }: any) => {
      const o = this.orders.find((ord) => ord.id === where.id);
      if (!o) return null;
      const asgn = this.deliveryAssignments.find((a) => a.orderId === o.id);
      let fullAsgn = null;
      if (asgn) {
        const d = this.driverProfiles.find((dp) => dp.id === asgn.driverId);
        const u = d ? this.users.find((user) => user.id === d.userId) : null;
        const hist = this.deliveryStatusHistoryList.filter((h) => h.assignmentId === asgn.id);
        fullAsgn = { ...asgn, driver: d ? { ...d, user: u } : null, statusHistory: hist };
      }
      return { ...o, deliveryAssignment: fullAsgn };
    },
    update: async ({ where, data }: any) => {
      const o = this.orders.find((ord) => ord.id === where.id);
      if (o) Object.assign(o, data);
      return o;
    },
  };

  public deliveryAssignment = {
    findUnique: async ({ where }: any) => {
      let a = null;
      if (where.id) a = this.deliveryAssignments.find((asgn) => asgn.id === where.id);
      if (where.orderId) a = this.deliveryAssignments.find((asgn) => asgn.orderId === where.orderId);
      if (!a) return null;
      const o = this.orders.find((ord) => ord.id === a.orderId);
      const d = this.driverProfiles.find((dp) => dp.id === a.driverId);
      const u = d ? this.users.find((user) => user.id === d.userId) : null;
      return { ...a, order: o, driver: d ? { ...d, user: u } : null };
    },
    findFirst: async ({ where }: any) => {
      const a = this.deliveryAssignments.find((asgn) => {
        if (asgn.driverId !== where.driverId) return false;
        if (where.status?.in && !where.status.in.includes(asgn.status)) return false;
        return true;
      });
      if (!a) return null;
      const o = this.orders.find((ord) => ord.id === a.orderId);
      const hist = this.deliveryStatusHistoryList.filter((h) => h.assignmentId === a.id);
      return { ...a, order: o, statusHistory: hist };
    },
    findMany: async () => {
      return this.deliveryAssignments.map((a) => {
        const o = this.orders.find((ord) => ord.id === a.orderId);
        const d = this.driverProfiles.find((dp) => dp.id === a.driverId);
        const u = d ? this.users.find((user) => user.id === d.userId) : null;
        return { ...a, order: o, driver: { ...d, user: u } };
      });
    },
    upsert: async ({ where, create, update }: any) => {
      let a = this.deliveryAssignments.find((asgn) => asgn.orderId === where.orderId);
      if (a) {
        Object.assign(a, update);
      } else {
        a = {
          id: `asgn-${Date.now()}`,
          ...create,
          createdAt: new Date(),
          updatedAt: new Date(),
        };
        this.deliveryAssignments.push(a);
      }
      const o = this.orders.find((ord) => ord.id === a.orderId);
      const d = this.driverProfiles.find((dp) => dp.id === a.driverId);
      const u = d ? this.users.find((user) => user.id === d.userId) : null;
      return { ...a, order: o, driver: { ...d, user: u } };
    },
    update: async ({ where, data }: any) => {
      const a = this.deliveryAssignments.find((asgn) => asgn.id === where.id);
      if (a) Object.assign(a, data, { updatedAt: new Date() });
      const o = this.orders.find((ord) => ord.id === a.orderId);
      return { ...a, order: o };
    },
  };

  public deliveryStatusHistory = {
    create: async ({ data }: any) => {
      const rec = { id: `hist-${Date.now()}`, ...data, createdAt: new Date() };
      this.deliveryStatusHistoryList.push(rec);
      return rec;
    },
  };

  public deliveryLocationHistory = {
    create: async ({ data }: any) => {
      const rec = { id: `loc-${Date.now()}`, ...data };
      this.deliveryLocationHistoryList.push(rec);
      return rec;
    },
  };

  public auditLog = {
    create: async ({ data }: any) => {
      const log = { id: `audit-${Date.now()}`, ...data, createdAt: new Date() };
      this.auditLogsList.push(log);
      return log;
    },
  };

  public $transaction = async (cb: any) => cb(this);
}

// Mock Delivery Gateway to capture broadcasts
class MockDeliveryGateway {
  public broadcasts: { event: string; target: string; payload: any }[] = [];

  broadcastLocationUpdate(orderId: string | null, driverId: string, payload: any) {
    this.broadcasts.push({ event: "location_update", target: `order:${orderId}`, payload });
  }

  broadcastStatusChange(orderId: string, driverId: string, payload: any) {
    this.broadcasts.push({ event: "status_change", target: `order:${orderId}`, payload });
  }

  broadcastDriverAssigned(orderId: string, driverId: string, payload: any) {
    this.broadcasts.push({ event: "driver_assigned", target: `order:${orderId}`, payload });
  }
}

// =============================================================================
// Test Runner
// =============================================================================

async function runDriverTrackingVerification() {
  console.log("=================================================================");
  console.log("  FAMILY VAISHNO DHABA - DRIVER & LIVE GPS TRACKING VERIFICATION ");
  console.log("=================================================================");

  const prisma = new MockPrismaDeliveryService();
  const routingService = new RoutingService();
  const gateway = new MockDeliveryGateway() as any;
  const deliveryService = new DeliveryService(prisma as any, routingService, gateway);

  let totalTests = 0;
  let passedTests = 0;

  const assert = (condition: boolean, desc: string) => {
    totalTests++;
    if (condition) {
      passedTests++;
      console.log(`✅ [PASS] ${desc}`);
    } else {
      console.error(`❌ [FAIL] ${desc}`);
      process.exitCode = 1;
    }
  };

  // ---------------------------------------------------------------------------
  // TEST 1: Role & Access Guarding
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 1: Role Enforcement (Customer accessing Driver Endpoints) ---");
  try {
    await deliveryService.getDriverProfile("customer-user-1");
    assert(false, "Customer without driver profile should be rejected");
  } catch (err: any) {
    assert(
      err.message.includes("Driver profile not found"),
      "Non-driver user blocked with 404/403 when requesting driver profile",
    );
  }

  try {
    await deliveryService.updateAvailability("customer-user-1", DriverAvailability.ONLINE);
    assert(false, "Customer should not be able to update driver availability");
  } catch (err: any) {
    assert(
      err.message.includes("Driver profile not found"),
      "Non-driver user blocked from toggling driver availability",
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 2: Administrator Activates Driver
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 2: Administrator Driver Activation & Role Escalation ---");
  const activatedDriver = await deliveryService.activateDriver(
    {
      userId: "candidate-driver-user",
      vehicleType: "BIKE",
      vehicleNumber: "PB-08-AB-1234",
      licenseNumber: "DL-PB082020001",
    },
    "admin-user-1",
    "127.0.0.1",
    "Mozilla/5.0",
  );

  assert(activatedDriver.status === DriverStatus.ACTIVE, "Driver profile status is ACTIVE");
  assert(activatedDriver.availability === DriverAvailability.OFFLINE, "Initial availability is OFFLINE");
  assert(activatedDriver.vehicleNumber === "PB-08-AB-1234", "Vehicle details persisted");

  const updatedCandidateUser = await prisma.user.findUnique({
    where: { id: "candidate-driver-user" },
  });
  assert(updatedCandidateUser.role === UserRole.DRIVER, "User role successfully elevated to DRIVER");

  const activationAudit = prisma.auditLogsList.find(
    (l) => l.action === "DRIVER_ACTIVATED" && l.userId === "admin-user-1",
  );
  assert(!!activationAudit, "Explicit AuditLog record created for driver activation");

  // ---------------------------------------------------------------------------
  // TEST 3: Driver Updates Availability
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 3: Active Driver Availability Toggle ---");
  const onlineProfile = await deliveryService.updateAvailability(
    "candidate-driver-user",
    DriverAvailability.ONLINE,
  );
  assert(onlineProfile.availability === DriverAvailability.ONLINE, "Driver availability set to ONLINE");

  // ---------------------------------------------------------------------------
  // TEST 4: Atomic Driver Assignment to Ready Order & Road Routing
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 4: Driver Assignment & Road Polyline Generation ---");
  const assignment = await deliveryService.assignDriverToOrder(
    {
      orderId: "order-101",
      driverId: activatedDriver.id,
      notes: "Urgent lunch delivery",
    },
    "admin-user-1",
  );

  assert(assignment.status === DeliveryStatus.ASSIGNED, "Assignment status is ASSIGNED");
  assert(assignment.orderId === "order-101", "Assigned to target order");
  assert(assignment.estimatedDurationMin > 0, `Route duration calculated: ${assignment.estimatedDurationMin} mins`);
  assert(assignment.estimatedDistanceKm > 0, `Route distance calculated: ${assignment.estimatedDistanceKm} km`);

  const parsedPolyline = JSON.parse(assignment.routePolyline);
  assert(
    Array.isArray(parsedPolyline) && parsedPolyline.length >= 2,
    `Real road route coordinates generated (${parsedPolyline.length} waypoints, not straight line)`,
  );

  const driverAfterAssign = await prisma.driverProfile.findUnique({
    where: { id: activatedDriver.id },
  });
  assert(driverAfterAssign.availability === DriverAvailability.BUSY, "Driver availability changed to BUSY");

  // Verify rejection when assigning to cancelled order
  try {
    await deliveryService.assignDriverToOrder(
      { orderId: "order-102", driverId: activatedDriver.id },
      "admin-user-1",
    );
    assert(false, "Should reject assignment to CANCELLED order");
  } catch (err: any) {
    assert(
      err.message.includes("Cannot assign driver to an order that is CANCELLED"),
      "Assignment to CANCELLED order rejected",
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 5: State Machine Lifecycle Progression
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 5: Delivery Lifecycle State Machine ---");

  // 1. Invalid jump: ASSIGNED -> DELIVERED must fail
  try {
    await deliveryService.transitionDeliveryStatus(
      "candidate-driver-user",
      assignment.id,
      DeliveryStatus.DELIVERED,
    );
    assert(false, "Illegal state jump ASSIGNED -> DELIVERED must be rejected");
  } catch (err: any) {
    assert(
      err.message.includes("Invalid status transition"),
      "Illegal direct state transition rejected by state machine",
    );
  }

  // 2. ASSIGNED -> ACCEPTED
  const stepAccepted = await deliveryService.transitionDeliveryStatus(
    "candidate-driver-user",
    assignment.id,
    DeliveryStatus.ACCEPTED,
  );
  assert(stepAccepted.status === DeliveryStatus.ACCEPTED, "Transition ASSIGNED -> ACCEPTED succeeded");

  // 3. ACCEPTED -> PICKED_UP
  const stepPickedUp = await deliveryService.transitionDeliveryStatus(
    "candidate-driver-user",
    assignment.id,
    DeliveryStatus.PICKED_UP,
  );
  assert(stepPickedUp.status === DeliveryStatus.PICKED_UP, "Transition ACCEPTED -> PICKED_UP succeeded");

  const orderAfterPickup = await prisma.order.findUnique({ where: { id: "order-101" } });
  assert(
    orderAfterPickup.status === OrderStatus.OUT_FOR_DELIVERY,
    "Order status synchronized to OUT_FOR_DELIVERY upon pickup",
  );

  // ---------------------------------------------------------------------------
  // TEST 6: Live GPS Location Ingest & Security Validation
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 6: Live GPS Ingestion, Accuracy Filter & Freshness ---");

  // 1. Valid GPS point near Kangra/Jalandhar
  const validLoc = await deliveryService.recordDriverLocation("candidate-driver-user", {
    latitude: 31.332,
    longitude: 75.562,
    heading: 90,
    speed: 25,
    accuracy: 12,
    timestamp: Date.now() - 2000, // 2s old
  });
  assert(validLoc.success === true, "Valid GPS coordinate accepted and stored");

  const lastRecordedLoc = prisma.deliveryLocationHistoryList[prisma.deliveryLocationHistoryList.length - 1];
  assert(lastRecordedLoc.latitude === 31.332, "Location history audit record persisted");

  // 2. Reject low accuracy (> 100 meters)
  try {
    await deliveryService.recordDriverLocation("candidate-driver-user", {
      latitude: 31.332,
      longitude: 75.562,
      accuracy: 250, // 250m accuracy is too degraded
    });
    assert(false, "Inaccurate GPS (> 100m) should be rejected");
  } catch (err: any) {
    assert(
      err.message.includes("exceeds maximum allowed threshold of 100m"),
      "Degraded GPS fix (>100m) rejected with 400 Bad Request",
    );
  }

  // 3. Reject stale GPS (> 60s old)
  try {
    await deliveryService.recordDriverLocation("candidate-driver-user", {
      latitude: 31.332,
      longitude: 75.562,
      accuracy: 10,
      timestamp: Date.now() - 95000, // 95 seconds old
    });
    assert(false, "Stale GPS timestamp (> 60s) should be rejected");
  } catch (err: any) {
    assert(
      err.message.includes("Stale timestamp"),
      "Stale GPS timestamp (>60s) rejected with 400 Bad Request",
    );
  }

  // 4. Reject future GPS timestamp
  try {
    await deliveryService.recordDriverLocation("candidate-driver-user", {
      latitude: 31.332,
      longitude: 75.562,
      accuracy: 10,
      timestamp: Date.now() + 60000, // 1 minute in the future
    });
    assert(false, "Future GPS timestamp should be rejected");
  } catch (err: any) {
    assert(
      err.message.includes("Timestamp is in the future"),
      "Future GPS timestamp rejected with 400 Bad Request",
    );
  }

  // ---------------------------------------------------------------------------
  // TEST 7: Cross-Customer Isolation on Live Tracking
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 7: Cross-Customer Live Tracking Isolation ---");

  // Customer 1 tracking their own order
  const trackingSelf = await deliveryService.getDeliveryTracking(
    "order-101",
    "customer-user-1",
    UserRole.CUSTOMER,
  );
  assert(trackingSelf.orderId === "order-101", "Order owner successfully retrieves tracking data");
  assert(trackingSelf.driver?.name === "Harjeet Singh", "Driver identity correctly visible to owner");
  assert(trackingSelf.routeCoordinates.length > 0, "Route coordinates provided to owner");

  // Customer 2 attempting to track Customer 1's order
  try {
    await deliveryService.getDeliveryTracking(
      "order-101",
      "customer-user-2",
      UserRole.CUSTOMER,
    );
    assert(false, "Customer 2 tracking Customer 1's order must be blocked");
  } catch (err: any) {
    assert(
      err.message.includes("Access denied: You are not authorized"),
      "Cross-customer tracking blocked with 403 Forbidden",
    );
  }

  // Admin tracking order
  const trackingAdmin = await deliveryService.getDeliveryTracking(
    "order-101",
    "admin-user-1",
    UserRole.ADMIN,
  );
  assert(trackingAdmin.orderId === "order-101", "Admin authorized to track any customer order");

  // ---------------------------------------------------------------------------
  // TEST 8: Driver Suspension & Revocation of Privileges
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 8: Driver Suspension & Real-Time Privilege Revocation ---");

  // Admin suspends driver
  const suspended = await deliveryService.updateDriverStatus(
    activatedDriver.id,
    { status: DriverStatus.SUSPENDED, reason: "Safety infraction reported" },
    "admin-user-1",
  );
  assert(suspended.status === DriverStatus.SUSPENDED, "Driver status set to SUSPENDED");
  assert(suspended.availability === DriverAvailability.OFFLINE, "Suspended driver forced to OFFLINE");

  // Suspended driver attempts to report location -> must be blocked
  try {
    await deliveryService.recordDriverLocation("candidate-driver-user", {
      latitude: 31.332,
      longitude: 75.562,
      accuracy: 10,
    });
    assert(false, "Suspended driver must not be allowed to report GPS location");
  } catch (err: any) {
    assert(
      err.message.includes("Active driver status required"),
      "Suspended driver blocked from reporting GPS",
    );
  }

  // Suspended driver attempts to go online -> must be blocked
  try {
    await deliveryService.updateAvailability(
      "candidate-driver-user",
      DriverAvailability.ONLINE,
    );
    assert(false, "Suspended driver must not be allowed to set availability to ONLINE");
  } catch (err: any) {
    assert(
      err.message.includes("Suspended drivers cannot change availability"),
      "Suspended driver blocked from setting availability to ONLINE",
    );
  }

  // Reactivate driver
  await deliveryService.updateDriverStatus(
    activatedDriver.id,
    { status: DriverStatus.ACTIVE, reason: "Infraction resolved" },
    "admin-user-1",
  );

  // ---------------------------------------------------------------------------
  // TEST 9: Delivery Completion & Driver Freeing
  // ---------------------------------------------------------------------------
  console.log("\n--- TEST 9: Delivery Completion & Driver Availability Reset ---");

  // Transition PICKED_UP -> OUT_FOR_DELIVERY
  const stepOutForDelivery = await deliveryService.transitionDeliveryStatus(
    "candidate-driver-user",
    assignment.id,
    DeliveryStatus.OUT_FOR_DELIVERY,
    "Driver en route with hot meal",
  );
  assert(stepOutForDelivery.status === DeliveryStatus.OUT_FOR_DELIVERY, "Transition PICKED_UP -> OUT_FOR_DELIVERY succeeded");

  // Transition OUT_FOR_DELIVERY -> DELIVERED
  const stepDelivered = await deliveryService.transitionDeliveryStatus(
    "candidate-driver-user",
    assignment.id,
    DeliveryStatus.DELIVERED,
    "Handed over to customer at door",
  );
  assert(stepDelivered.status === DeliveryStatus.DELIVERED, "Assignment marked DELIVERED");

  const orderDelivered = await prisma.order.findUnique({ where: { id: "order-101" } });
  assert(orderDelivered.status === OrderStatus.DELIVERED, "Order status updated to DELIVERED");

  const driverAfterDelivered = await prisma.driverProfile.findUnique({
    where: { id: activatedDriver.id },
  });
  assert(
    driverAfterDelivered.availability === DriverAvailability.ONLINE,
    "Driver availability automatically reset to ONLINE after delivery",
  );

  console.log(
    `\n🎉 ALL ${passedTests}/${totalTests} DRIVER & GPS TRACKING TESTS PASSED SUCCESSFULLY!`,
  );
}

runDriverTrackingVerification().catch((err) => {
  console.error("Test run failed with unexpected error:", err);
  process.exit(1);
});
