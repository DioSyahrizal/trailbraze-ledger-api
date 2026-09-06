import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';

@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  use(req: Request, res: Response, next: NextFunction) {
    console.log({
      timestamp: new Date().toISOString(),
      method: req.method,
      path: req.path,
      originalUrl: req.originalUrl.split('?')[0],
      statusCode: res.statusCode,
    });
    next();
  }
}
