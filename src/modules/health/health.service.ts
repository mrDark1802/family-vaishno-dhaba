import { Injectable, Logger } from "@nestjs/common";
import { PrismaService } from "../../database/prisma.service";
import { HealthStatus } from "../../types";

@Injectable()
export class HealthService {
  private readonly logger = new Logger(HealthService.name);
  private readonly startTime = Date.now();

  constructor(private readonly prisma: PrismaService) {}

  async check(): Promise<HealthStatus> {
    let databaseStatus: "connected" | "disconnected" = "disconnected";

    try {
      // Fast ping to verify database connection
      await this.prisma.$queryRaw`SELECT 1`;
      databaseStatus = "connected";
    } catch (error) {
      this.logger.error("Database healthcheck query failed", error);
      databaseStatus = "disconnected";
    }

    const uptime = Math.floor((Date.now() - this.startTime) / 1000);
    const isHealthy = databaseStatus === "connected";

    return {
      status: isHealthy ? "ok" : "degraded",
      timestamp: new Date().toISOString(),
      uptime,
      environment: process.env.NODE_ENV || "development",
      database: databaseStatus,
      version: "0.1.0",
    };
  }
}
