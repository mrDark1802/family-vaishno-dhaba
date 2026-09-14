import {
  Injectable,
  OnModuleInit,
  OnModuleDestroy,
  Logger,
} from "@nestjs/common";
import { PrismaClient } from "@prisma/client";
import { execSync } from "child_process";
import * as path from "path";
import * as fs from "fs";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === "development"
          ? [
              { emit: "event", level: "query" },
              { emit: "stdout", level: "info" },
              { emit: "stdout", level: "warn" },
              { emit: "stdout", level: "error" },
            ]
          : [{ emit: "stdout", level: "error" }],
    });
  }

  async onModuleInit() {
    try {
      await this.$connect();
      this.logger.log("Successfully connected to PostgreSQL database");
      await this.ensureTablesAndSync();
    } catch (error) {
      this.logger.warn(
        "Initial PostgreSQL connection not available. Database will reconnect upon readiness.",
        error,
      );
    }
  }

  /**
   * Automatically check if tables exist and synchronize schema
   */
  async ensureTablesAndSync() {
    try {
      // Check if core tables exist
      const tableCheck: Array<{ table_name: string }> = await this.$queryRaw`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public' AND table_name = 'categories';
      `;

      if (!tableCheck || tableCheck.length === 0) {
        this.logger.log(
          "Database tables not found. Automatically synchronizing schema via Prisma db push...",
        );

        const candidatePaths = [
          path.resolve(process.cwd(), "prisma/schema.prisma"),
          path.resolve(process.cwd(), "../../prisma/schema.prisma"),
          path.resolve(__dirname, "../../../../prisma/schema.prisma"),
        ];
        const schemaPath = candidatePaths.find((p) => fs.existsSync(p));

        if (schemaPath) {
          execSync(
            `npx prisma db push --schema="${schemaPath}" --skip-generate`,
            {
              stdio: "inherit",
              env: process.env,
            },
          );
          this.logger.log(
            "Database tables automatically created and synchronized.",
          );
        } else {
          this.logger.warn("Prisma schema file not located for auto db push.");
        }
      } else {
        this.logger.log("Database schema verified (tables exist).");
      }
    } catch (err) {
      this.logger.warn("Auto-sync database check notice:", err);
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
    this.logger.log("Disconnected from PostgreSQL database");
  }
}

