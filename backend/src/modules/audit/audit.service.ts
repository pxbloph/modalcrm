
import { Injectable, Logger } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { ClsService } from 'nestjs-cls';

export interface AuditEvent {
    level: 'DEBUG' | 'INFO' | 'WARN' | 'ERROR';
    event_type: string;
    entity_type: string;
    entity_id?: string;
    action: string;
    actor_id?: string; // Optional override
    before?: any;
    after?: any;
    metadata?: any;
    tags?: string[];
}

@Injectable()
export class AuditService {
    private readonly logger = new Logger(AuditService.name);

    constructor(
        private prisma: PrismaService,
        private cls: ClsService,
    ) { }

    /**
     * Registra um evento de auditoria.
     * Este método é safe-fail: erros ao salvar o log não quebram a aplicação, apenas loga no console.
     */
    async log(event: AuditEvent) {
        try {
            const requestContext = this.cls.get('requestContext') || {};
            const user = this.cls.get('user');

            // Mascarar dados sensíveis antes de salvar (implementação simplificada aqui, ideal seria utilitário recursivo)
            const sanitize = (data: any) => {
                if (!data) return null;
                const sensitiveKeys = ['password', 'password_hash', 'token', 'authorization', 'cookie', 'cvv', 'card_number'];
                // Deep copy simplificado
                const copy = JSON.parse(JSON.stringify(data));

                const mask = (obj: any) => {
                    if (typeof obj !== 'object' || obj === null) return;
                    for (const key in obj) {
                        if (sensitiveKeys.some(k => key.toLowerCase().includes(k))) {
                            obj[key] = '*****';
                        } else {
                            mask(obj[key]);
                        }
                    }
                };
                mask(copy);
                return copy;
            };

            const payload = {
                before: sanitize(event.before),
                after: sanitize(event.after),
                metadata: sanitize(event.metadata),
                // Request/Response bodies podem vir do contexto se necessário, ou passados no metadata
            };

            const hasPayload = Object.values(payload).some(v => v !== null && v !== undefined);

            await this.prisma.auditLog.create({
                data: {
                    level: event.level,
                    event_type: event.event_type,
                    entity_type: event.entity_type,
                    entity_id: event.entity_id,
                    action: event.action,
                    actor_id: event.actor_id || user?.id || null,
                    request_id: requestContext.requestId,
                    ip_address: requestContext.ip,
                    user_agent: requestContext.userAgent,
                    route: requestContext.path,
                    method: requestContext.method,
                    tags: event.tags ? JSON.stringify(event.tags) : undefined,
                    payload: hasPayload ? {
                        create: payload
                    } : undefined
                }
            });

        } catch (error) {
            this.logger.error(`Failed to save audit log: ${error.message} `, error.stack);
            // Não re-throw erro para não afetar o fluxo principal
        }
    }
}
