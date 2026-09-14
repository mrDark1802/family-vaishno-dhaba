import { NestFactory } from "@nestjs/core";
import { ExpressAdapter } from "@nestjs/platform-express";
import { ValidationPipe } from "@nestjs/common";
import express from "express";
import helmet from "helmet";
import cookieParser from "cookie-parser";
import { AppModule } from "../src/app.module";

let cachedServer: any;

async function bootstrapServer() {
  const server = express();

  const app = await NestFactory.create(
    AppModule,
    new ExpressAdapter(server),
    {
      logger: ["error", "warn", "log"],
    },
  );

  // Security Headers
  app.use(
    helmet({
      contentSecurityPolicy: false,
      crossOriginEmbedderPolicy: false,
    }),
  );

  // JSON & URL-encoded body
  app.use(
    express.json({
      limit: "10mb",
      verify: (req: any, _res: any, buf: Buffer) => {
        req.rawBody = buf;
      },
    }),
  );
  app.use(express.urlencoded({ limit: "10mb", extended: true }));

  // Cookie Parser
  app.use(cookieParser(process.env.COOKIE_SECRET || "dev_cookie_secret"));

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

  // Global Validation Pipe
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

  await app.init();
  return server;
}

export default async function handler(req: any, res: any) {
  if (!cachedServer) {
    cachedServer = await bootstrapServer();
  }
  return cachedServer(req, res);
}
