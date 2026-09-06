import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
} from '@nestjs/common';
import type { Request, Response } from 'express';

type ExceptionResponse = {
  message?: string | string[];
  error?: string;
};

@Catch()
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: unknown, host: ArgumentsHost): void {
    const context = host.switchToHttp();
    const response = context.getResponse<Response>();
    const request = context.getRequest<Request>();

    const isHttpException = exception instanceof HttpException;
    const status = isHttpException
      ? exception.getStatus()
      : HttpStatus.INTERNAL_SERVER_ERROR;

    const exceptionResponse = isHttpException
      ? exception.getResponse()
      : undefined;
    const message = this.getMessage(exceptionResponse, isHttpException);

    response.status(status).json({
      statusCode: status,
      code: HttpStatus[status] ?? 'INTERNAL_SERVER_ERROR',
      message,
      path: request.url,
      timestamp: new Date().toISOString(),
    });
  }

  private getMessage(
    exceptionResponse: string | object | undefined,
    isHttpException: boolean,
  ): string | string[] {
    if (typeof exceptionResponse === 'string') {
      return exceptionResponse;
    }

    if (this.isExceptionResponse(exceptionResponse)) {
      if (exceptionResponse.message) {
        return exceptionResponse.message;
      }

      if (exceptionResponse.error) {
        return exceptionResponse.error;
      }
    }

    if (isHttpException) {
      return 'Request failed';
    }

    return 'Internal server error';
  }

  private isExceptionResponse(
    value: string | object | undefined,
  ): value is ExceptionResponse {
    return typeof value === 'object' && value !== null;
  }
}
