import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Inject,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { WINSTON_MODULE_PROVIDER } from 'nest-winston';
import * as winston from 'winston';

@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  constructor(
    @Inject(WINSTON_MODULE_PROVIDER)
    private readonly logger: winston.Logger,
  ) {}

  catch(exception: any, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();

    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;

    const message =
      exception instanceof HttpException
        ? exception.getResponse()
        : 'Internal server error';

    const errorResponse = {
      success: false,
      statusCode: status,
      timestamp: new Date().toISOString(),
      path: request.url,
      message: (message as any).message || message || 'Internal server error',
      errors: Array.isArray((message as any).message)
        ? (message as any).message
        : [(message as any).message || message || 'Internal server error'],
    };

    // Log the error
    if (status >= 500) {
      this.logger.error(`${request.method} ${request.url} ${status} - Error: ${exception.message}`, {
        stack: exception.stack,
        requestBody: request.body,
      });
    } else {
      this.logger.warn(`${request.method} ${request.url} ${status} - ${errorResponse.message}`);
    }

    response.status(status).json(errorResponse);
  }
}
