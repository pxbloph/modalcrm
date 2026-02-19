import { Injectable, NestInterceptor, ExecutionContext, CallHandler, HttpException, HttpStatus } from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { tap, catchError } from 'rxjs/operators';
import { AuditService } from '../../modules/audit/audit.service';
import { Reflector } from '@nestjs/core';

import { ClsService } from 'nestjs-cls';

@Injectable()
export class AuditInterceptor implements NestInterceptor {
    constructor(
        private auditService: AuditService,
        private reflector: Reflector,
        private cls: ClsService
    ) { }

    intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
        const httpContext = context.switchToHttp();
        const req = httpContext.getRequest();

        // Sync User to CLS Context (Crucial for Audit Logs)
        if (req.user) {
            this.cls.set('user', req.user);
        }

        const start = Date.now();

        // Ignorar rotas de health check ou assets se necessário
        if (req.path === '/health' || req.path === '/metrics') {
            return next.handle();
        }

        return next.handle().pipe(
            tap((data) => {
                const duration = Date.now() - start;
                const res = httpContext.getResponse();

                // Log successful request (DEBUG level for GET, INFO for others)
                const level = req.method === 'GET' ? 'DEBUG' : 'INFO';

                this.auditService.log({
                    level,
                    event_type: 'HTTP_REQUEST',
                    entity_type: 'SYSTEM',
                    action: `${req.method} ${req.path}`,
                    before: null,
                    after: null, // Pode ser muito verbo logar todo response body
                    metadata: {
                        statusCode: res.statusCode,
                        duration_ms: duration,
                        query: req.query,
                        params: req.params
                    }
                });
            }),
            catchError((error) => {
                const duration = Date.now() - start;
                const status = error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR;

                this.auditService.log({
                    level: 'ERROR',
                    event_type: 'HTTP_ERROR',
                    entity_type: 'SYSTEM',
                    action: `${req.method} ${req.path}`,
                    before: req.body, // Log request body on error helps debugging
                    after: null,
                    metadata: {
                        statusCode: status,
                        duration_ms: duration,
                        errorMessage: error.message,
                        stack: error.stack
                    }
                });

                return throwError(() => error);
            }),
        );
    }
}
