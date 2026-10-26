import { DriverStatus, DriverAvailability, DeliveryStatus } from "@prisma/client";
export { DriverStatus, DriverAvailability, DeliveryStatus };

export interface DriverUserSummary {
  id: string;
  name: string | null;
  phone: string | null;
  email: string | null;
}

export interface DriverProfileSummary {
  id: string;
  userId: string;
  status: DriverStatus;
  availability: DriverAvailability;
  vehicleType: string | null;
  vehicleNumber: string | null;
  licenseNumber: string | null;
  currentLatitude: number | null;
  currentLongitude: number | null;
  currentHeading: number | null;
  currentSpeed: number | null;
  lastLocationUpdate: string | null;
  user: DriverUserSummary;
  activeDelivery?: DeliveryAssignmentSummary | null;
}

export interface DeliveryAssignmentSummary {
  id: string;
  orderId: string;
  orderNumber: string;
  driverId: string;
  status: DeliveryStatus;
  assignedAt: string;
  acceptedAt?: string | null;
  pickedUpAt?: string | null;
  deliveredAt?: string | null;
  estimatedDurationMin?: number | null;
  estimatedDistanceKm?: number | null;
}

export interface LocationUpdatePayload {
  latitude: number;
  longitude: number;
  heading?: number;
  speed?: number;
  accuracy?: number;
  timestamp: number;
}

export interface DeliveryTrackingResponse {
  orderId: string;
  orderNumber: string;
  orderStatus: string;
  deliveryStatus: DeliveryStatus | null;
  driver: {
    id: string;
    name: string | null;
    phone: string | null;
    vehicleType: string | null;
    vehicleNumber: string | null;
  } | null;
  driverLocation: {
    latitude: number;
    longitude: number;
    heading: number | null;
    speed: number | null;
    updatedAt: string | null;
  } | null;
  restaurantLocation: {
    latitude: number;
    longitude: number;
    name: string;
    address: string;
  };
  customerLocation: {
    latitude: number | null;
    longitude: number | null;
    address: string | null;
    landmark: string | null;
    recipientName: string | null;
    phone: string | null;
  };
  routeCoordinates: [number, number][]; // [latitude, longitude] pairs for polyline
  estimatedDurationMin: number | null;
  estimatedDistanceKm: number | null;
  statusHistory: {
    status: DeliveryStatus;
    notes?: string | null;
    createdAt: string;
  }[];
  isStale: boolean;
}
