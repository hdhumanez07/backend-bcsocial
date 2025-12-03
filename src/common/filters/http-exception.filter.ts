import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(HttpExceptionFilter.name);
  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const request = ctx.getRequest<Request>();
    const status =
      exception instanceof HttpException
        ? exception.getStatus()
        : HttpStatus.INTERNAL_SERVER_ERROR;
    const exceptionResponse =
      exception instanceof HttpException
        ? (exception.getResponse() as
            | string
            | {
                message: string | string[];
                error?: string;
                statusCode?: number;
              })
        : null;
    const message =
      typeof exceptionResponse === 'string'
        ? exceptionResponse
        : exceptionResponse?.message || 'Internal server error';
    const errorDetails = {
      timestamp: new Date().toISOString(),
      path: request.url,
      method: request.method,
      ip: request.ip,
      userAgent: request.get('user-agent'),
      statusCode: status,
      message: Array.isArray(message) ? message : [message],
      stack: exception instanceof Error ? exception.stack : undefined,
    };
    if (status >= 500) {
      this.logger.error('Server Error:', JSON.stringify(errorDetails, null, 2));
    } else if (status >= 400) {
      this.logger.warn(
        'Client Error:',
        JSON.stringify({ ...errorDetails, stack: undefined }, null, 2),
      );
    }
    const clientResponse: {
      statusCode: number;
      timestamp: string;
      path: string;
      message: string[];
    } = {
      statusCode: status,
      timestamp: errorDetails.timestamp,
      path: errorDetails.path,
      message: Array.isArray(message) ? message : [message],
    };
    if (status === 500) {
      clientResponse.message = [
        'An unexpected error occurred. Please try again later.',
      ];
    }
    response.status(status).json(clientResponse);
  }
}
