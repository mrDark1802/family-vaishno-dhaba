import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  Logger,
} from "@nestjs/common";
import { Observable } from "rxjs";
import { tap } from "rxjs/operators";
import { Request } from "express";

@Injectable()
export class LoggingInterceptor implements NestInterceptor {
  private readonly logger = new Logger("HTTP");

  intercept(context: ExecutionContext, next: CallHandler): Observable<unknown> {
    const request = context.switchToHttp().getRequest<Request>();
    const { method, url, ip } = request;
    const userAgent = request.get("user-agent") || "unknown";
    const startTime = Date.now();

    return next.handle().pipe(
      tap({
        next: () => {
          const duration = Date.now() - startTime;
          this.logger.log(
            `[${method}] ${url} - ${duration}ms | IP: ${ip} | UA: ${userAgent}`,
          );
        },
        error: (err: unknown) => {
          const duration = Date.now() - startTime;
          const status = (err as { status?: number })?.status || 500;
          this.logger.warn(
            `[${method}] ${url} - Status: ${status} - ${duration}ms | IP: ${ip}`,
          );
        },
      }),
    );
  }
}
