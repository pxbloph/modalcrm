import { Injectable, NestMiddleware } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { Request, Response, NextFunction } from 'express';
import { v4 as uuidv4 } from 'uuid';

@Injectable()
export class RequestContextMiddleware implements NestMiddleware {
    constructor(private readonly cls: ClsService) { }

    use(req: Request, res: Response, next: NextFunction) {
        this.cls.run(() => {
            const requestId = req.headers['x-request-id'] || uuidv4();
            const traceId = req.headers['x-trace-id'] || uuidv4();

            this.cls.set('requestContext', {
                requestId,
                traceId,
                ip: req.ip,
                userAgent: req.headers['user-agent'],
                path: req.path,
                method: req.method,
            });

            // User info will be set later by AuthGuard if authenticated
            // But we initialize it as null here
            this.cls.set('user', null);

            res.setHeader('x-request-id', requestId as string);

            next();
        });
    }
}
