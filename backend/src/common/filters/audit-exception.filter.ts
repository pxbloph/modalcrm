import { ExceptionFilter, Catch, ArgumentsHost, HttpException, HttpStatus } from '@nestjs/common';
import { Request, Response } from 'express';
import { AuditService } from '../../modules/audit/audit.service';

@Catch()
export class AuditExceptionFilter implements ExceptionFilter {
    constructor(private readonly auditService: AuditService) { }

    catch(exception: unknown, host: ArgumentsHost) {
        const ctx = host.switchToHttp();
        const response = ctx.getResponse<Response>();
        const request = ctx.getRequest<Request>();

        let status = HttpStatus.INTERNAL_SERVER_ERROR;
        let message = 'Internal server error';
        let stack = null;

        if (exception instanceof HttpException) {
            status = exception.getStatus();
            const res = exception.getResponse();
            message = typeof res === 'string' ? res : (res as any).message || JSON.stringify(res);
            stack = exception.stack;
        } else if (exception instanceof Error) {
            message = exception.message;
            stack = exception.stack;
        }

        // Log the error
        this.auditService.log({
            level: status >= 500 ? 'ERROR' : 'WARN',
            event_type: 'EXCEPTION',
            entity_type: 'SYSTEM',
            action: 'UNHANDLED_EXCEPTION',
            before: null,
            after: null,
            metadata: {
                statusCode: status,
                path: request.url,
                method: request.method,
                errorMessage: message,
                stack: stack
            }
        });

        response
            .status(status)
            .json({
                statusCode: status,
                message: message,
                timestamp: new Date().toISOString(),
                path: request.url,
            });
    }
}
