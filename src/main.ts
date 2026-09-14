import { NestFactory } from "@nestjs/core";
import { Logger, ValidationPipe } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "./app.module";

async function bootstrap() {
  const logger = new Logger("Bootstrap");
  const app = await NestFactory.create(AppModule);

  const configService = app.get(ConfigService);
  const port = configService.get<number>("port", 4000);
  const allowedOrigins = configService.get<string[]>("cors.origin", [
    "http://localhost:3000",
    "http://localhost:3001",
  ]);
  const cookieSecret = configService.get<string>(
    "cookie.secret",
    "dev_cookie_secret",
  );

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy:
        process.env.NODE_ENV === "production" ? undefined : false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // Request Body Size Limits & Raw Body retention for Webhook HMAC signature verification
  const express = await import("express");
  app.use(
    express.json({
      limit: "1mb",
      verify: (req: any, _res: any, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ limit: "1mb", extended: true }));

  // Cookie Parser for HTTP-only cookies
  app.use(cookieParser(cookieSecret));

  // CORS Configuration - Permissive for Web, Mobile, Electron, Vercel
  app.enableCors({
    origin: true,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS", "HEAD"],
    allowedHeaders: [
      "Content-Type",
      "Authorization",
      "Accept",
      "X-Requested-With",
      "Idempotency-Key",
      "idempotency-key",
      "X-Idempotency-Key",
      "x-idempotency-key",
      "Origin",
      "Access-Control-Request-Method",
      "Access-Control-Request-Headers",
    ],
    exposedHeaders: ["Idempotency-Key", "idempotency-key"],
  });

  // Global API Prefix (excluding root route)
  app.setGlobalPrefix("api", { exclude: ["/"] });

  // Global Validation Pipe with tolerant query parsing
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: false,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // Graceful Shutdown
  app.enableShutdownHooks();

  await app.listen(port, "0.0.0.0");
  logger.log(
    `🚀 Family Vaishno Dhaba API is running on http://localhost:${port}/api`,
  );
  logger.log(
    `🏥 Health Check available at http://localhost:${port}/api/health`,
  );
}

bootstrap().catch((err) => {
  console.error("Fatal error during application startup:", err);
  process.exit(1);
});
