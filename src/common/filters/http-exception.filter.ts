import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from "@nestjs/common";
import { Request, Response } from "express";
import { ApiResponse } from "@repo/types";

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger(AllExceptionsFilter.name);

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException ? exception.getResponse() : null;

    let errorCode = "INTERNAL_SERVER_ERROR";
    let errorMessage = "An unexpected internal error occurred";
    let errorDetails: unknown = undefined;

    if (isHttpException) {
      if (typeof exceptionResponse === "string") {
        errorMessage = exceptionResponse;
        errorCode = exception.name;
      } else if (
        typeof exceptionResponse === "object" &&
        exceptionResponse !== null
      ) {
        const resObj = exceptionResponse as Record<string, unknown>;
        errorMessage = (resObj.message as string) || exception.message;
        errorCode = (resObj.error as string) || exception.name;
        if (Array.isArray(resObj.message)) {
          errorMessage = "Validation error";
          errorDetails = resObj.message;
          errorCode = "VALIDATION_FAILED";
        }
      }
    } else {
      // Log full internal error in server logs only
      this.logger.error(
        `Unhandled Exception on ${request.method} ${request.url}: ${(exception as Error)?.message || exception}`,
        (exception as Error)?.stack,
      );
    }

    const payload: ApiResponse<never> = {
      success: false,
      error: {
        code: errorCode,
        message: errorMessage,
        details: errorDetails,
      },
      meta: {
        timestamp: new Date().toISOString(),
        path: request.url,
      },
    };

    response.status(status).json(payload);
  }
}
