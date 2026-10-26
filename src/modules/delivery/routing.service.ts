import { Injectable, Logger } from "@nestjs/common";

export interface LatLng {
  latitude: number;
  longitude: number;
}

export interface RouteResult {
  coordinates: [number, number][]; // [latitude, longitude] tuples
  distanceKm: number;
  durationMin: number;
  provider: "osrm" | "fallback";
}

interface CacheEntry {
  result: RouteResult;
  expiresAt: number;
}

@Injectable()
export class RoutingService {
  private readonly logger = new Logger(RoutingService.name);
  private readonly cache = new Map<string, CacheEntry>();
  private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutes

  /**
   * Calculate driving route between origin and destination coordinates.
   * Returns road-following polyline coordinates ([lat, lng]), distance in km, and duration in minutes.
   */
  async calculateRoute(
    origin: LatLng,
    destination: LatLng,
  ): Promise<RouteResult> {
    const cacheKey = this.getCacheKey(origin, destination);
    const cached = this.cache.get(cacheKey);
    if (cached && cached.expiresAt > Date.now()) {
      return cached.result;
    }

    try {
      const result = await this.fetchOsrmRoute(origin, destination);
      this.cache.set(cacheKey, {
        result,
        expiresAt: Date.now() + this.CACHE_TTL_MS,
      });
      return result;
    } catch (err: any) {
      this.logger.warn(
        `OSRM routing request failed: ${err.message}. Using high-precision interpolated fallback.`,
      );
      return this.generateFallbackRoute(origin, destination);
    }
  }

  private async fetchOsrmRoute(
    origin: LatLng,
    destination: LatLng,
  ): Promise<RouteResult> {
    const url = `http://router.project-osrm.org/route/v1/driving/${origin.longitude},${origin.latitude};${destination.longitude},${destination.latitude}?overview=full&geometries=geojson`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 4000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: {
        Accept: "application/json",
        "User-Agent": "FamilyVaishnoDhaba-DeliveryService/1.0",
      },
    });
    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const data = await response.json();
    if (data.code !== "Ok" || !data.routes || data.routes.length === 0) {
      throw new Error(`OSRM response code: ${data.code || "No routes"}`);
    }

    const primaryRoute = data.routes[0];
    const distanceMeters = primaryRoute.distance || 0;
    const durationSeconds = primaryRoute.duration || 0;

    // OSRM GeoJSON format is [longitude, latitude] -> convert to [latitude, longitude]
    const rawCoords: [number, number][] = primaryRoute.geometry.coordinates || [];
    const coordinates: [number, number][] = rawCoords.map(([lng, lat]) => [
      Number(lat.toFixed(6)),
      Number(lng.toFixed(6)),
    ]);

    const distanceKm = Number((distanceMeters / 1000).toFixed(2));
    const durationMin = Math.max(1, Math.round(durationSeconds / 60));

    return {
      coordinates,
      distanceKm,
      durationMin,
      provider: "osrm",
    };
  }

  /**
   * Fallback if OSRM is offline: Generates a multi-step geodesic path with simulated driving speed.
   */
  private generateFallbackRoute(
    origin: LatLng,
    destination: LatLng,
  ): RouteResult {
    const steps = 15;
    const coordinates: [number, number][] = [];

    const latDelta = (destination.latitude - origin.latitude) / steps;
    const lngDelta = (destination.longitude - origin.longitude) / steps;

    for (let i = 0; i <= steps; i++) {
      coordinates.push([
        Number((origin.latitude + latDelta * i).toFixed(6)),
        Number((origin.longitude + lngDelta * i).toFixed(6)),
      ]);
    }

    const distanceKm = Number(
      this.calculateHaversineDistanceKm(origin, destination).toFixed(2),
    );
    // Average urban speed: ~25 km/h + 5 min pickup buffer
    const durationMin = Math.max(3, Math.round((distanceKm / 25) * 60) + 5);

    return {
      coordinates,
      distanceKm,
      durationMin,
      provider: "fallback",
    };
  }

  private calculateHaversineDistanceKm(p1: LatLng, p2: LatLng): number {
    const R = 6371; // Earth radius in km
    const dLat = this.deg2rad(p2.latitude - p1.latitude);
    const dLng = this.deg2rad(p2.longitude - p1.longitude);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(p1.latitude)) *
        Math.cos(this.deg2rad(p2.latitude)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private deg2rad(deg: number): number {
    return deg * (Math.PI / 180);
  }

  private getCacheKey(p1: LatLng, p2: LatLng): string {
    return `${p1.latitude.toFixed(4)},${p1.longitude.toFixed(4)}->${p2.latitude.toFixed(4)},${p2.longitude.toFixed(4)}`;
  }
}
