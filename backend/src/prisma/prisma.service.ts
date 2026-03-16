import { Injectable, OnModuleDestroy, OnModuleInit, Logger } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';

export type DatabaseQueryLog = {
    id: string;
    timestamp: string;
    durationMs: number;
    query: string;
    params: string;
    target?: string;
};

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
    private readonly logger = new Logger(PrismaService.name);
    private readonly maxQueryLogs = 5000;
    private readonly queryLogs: DatabaseQueryLog[] = [];

    constructor() {
        super({
            log: [
                { emit: 'event', level: 'query' },
                { emit: 'stdout', level: 'error' },
                { emit: 'stdout', level: 'warn' },
            ],
        });

        (this as any).$on('query', (event: Prisma.QueryEvent) => {
            const log: DatabaseQueryLog = {
                id: `${event.timestamp.getTime()}-${Math.random().toString(36).slice(2, 8)}`,
                timestamp: event.timestamp.toISOString(),
                durationMs: event.duration,
                query: event.query,
                params: event.params,
                target: event.target,
            };

            this.queryLogs.push(log);
            if (this.queryLogs.length > this.maxQueryLogs) {
                this.queryLogs.splice(0, this.queryLogs.length - this.maxQueryLogs);
            }
        });

        this.$use(async (params, next) => {
            if (['create', 'update', 'createMany', 'updateMany', 'upsert'].includes(params.action)) {
                this.injectTimestamps(params);
                this.shiftDatesRecursively(params.args);
            }
            const result = await next(params);

            if (['findUnique', 'findFirst', 'findMany'].includes(params.action) && result) {
                this.shiftDatesRecursivelyRead(result);
            }

            return result;
        });
    }

    async onModuleInit() {
        await this.$connect();
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    getQueryLogs(limit = 200) {
        const safeLimit = Math.max(1, Math.min(5000, Number(limit) || 200));
        return [...this.queryLogs].reverse().slice(0, safeLimit);
    }

    async getCurrentConnectionInfo() {
        try {
            const rows = await this.$queryRawUnsafe<Array<{ database: string; user: string; host: string | null; port: number | null }>>(
                'select current_database() as database, current_user as "user", inet_server_addr()::text as host, inet_server_port() as port'
            );
            return rows[0] || null;
        } catch {
            return null;
        }
    }

    async testConnection(databaseUrl: string) {
        const client = new PrismaClient({ datasources: { db: { url: databaseUrl } } });
        try {
            await client.$connect();
            const rows = await client.$queryRawUnsafe<Array<{ database: string; user: string; host: string | null; port: number | null }>>(
                'select current_database() as database, current_user as "user", inet_server_addr()::text as host, inet_server_port() as port'
            );
            return rows[0] || null;
        } finally {
            await client.$disconnect();
        }
    }

    async switchDatabaseUrl(databaseUrl: string) {
        const previousUrl = process.env.DATABASE_URL;
        const internal = this as any;

        try {
            await this.$disconnect();

            process.env.DATABASE_URL = databaseUrl;

            if (internal._engineConfig) {
                internal._engineConfig = {
                    ...internal._engineConfig,
                    datasourceUrl: databaseUrl,
                };
            }

            if (internal._engine) {
                try {
                    await internal._engine.stop?.();
                } catch (error) {
                    this.logger.warn(`Falha ao parar engine antiga: ${String(error)}`);
                }
                internal._engine = undefined;
            }

            await this.$connect();
            return { applied: true };
        } catch (error) {
            if (previousUrl) {
                process.env.DATABASE_URL = previousUrl;
                if (internal._engineConfig) {
                    internal._engineConfig = {
                        ...internal._engineConfig,
                        datasourceUrl: previousUrl,
                    };
                }
                try {
                    await this.$connect();
                } catch {
                    // noop
                }
            }
            return {
                applied: false,
                error: error instanceof Error ? error.message : 'Falha ao trocar conexão em runtime.',
            };
        }
    }

    private shiftDatesRecursively(obj: any) {
        if (!obj || typeof obj !== 'object') return;

        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (value instanceof Date) {
                obj[key] = new Date(value.getTime() - (3 * 60 * 60 * 1000));
            } else if (typeof value === 'object') {
                this.shiftDatesRecursively(value);
            }
        }
    }

    private shiftDatesRecursivelyRead(obj: any) {
        if (!obj || typeof obj !== 'object') return;

        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (value instanceof Date) {
                obj[key] = new Date(value.getTime() + (3 * 60 * 60 * 1000));
            } else if (typeof value === 'object') {
                this.shiftDatesRecursivelyRead(value);
            }
        }
    }

    private injectTimestamps(params: Prisma.MiddlewareParams) {
        if (!params.args) return;

        const modelFields = this.getTimestampMap()[params.model || ''];
        if (!modelFields || modelFields.length === 0) return;

        const inject = (obj: any, mode: 'create' | 'update') => {
            if (!obj || typeof obj !== 'object') return;
            const now = new Date();
            for (const field of modelFields) {
                if (mode === 'create') {
                    if (obj[field] === undefined) obj[field] = now;
                } else if (mode === 'update') {
                    if ((field === 'updated_at' || field === 'last_message_at' || field === 'read_at') && obj[field] === undefined) {
                        obj[field] = now;
                    }
                }
            }
        };

        if (params.action === 'create') {
            inject(params.args.data, 'create');
        } else if (params.action === 'createMany') {
            if (Array.isArray(params.args.data)) {
                params.args.data.forEach((item: any) => inject(item, 'create'));
            } else {
                inject(params.args.data, 'create');
            }
        } else if (params.action === 'update' || params.action === 'updateMany') {
            inject(params.args.data, 'update');
        } else if (params.action === 'upsert') {
            if (params.args.create) inject(params.args.create, 'create');
            if (params.args.update) inject(params.args.update, 'update');
        }
    }

    private getTimestampMap(): Record<string, string[]> {
        return {
            User: ['created_at'],
            KanbanFilterPreset: ['created_at', 'updated_at'],
            UserKanbanPreference: ['updated_at'],
            Client: ['created_at', 'updated_at'],
            FormTemplate: ['created_at'],
            ImportJob: ['created_at', 'updated_at'],
            ImportResult: ['created_at'],
            Conversation: ['last_message_at', 'created_at', 'updated_at'],
            Message: ['created_at'],
            ChatAuditLog: ['created_at'],
            LeadOwnerTransferAudit: ['created_at'],
            DeletedLeadArchive: ['deleted_at'],
            SystemSetting: ['created_at', 'updated_at'],
            Pipeline: ['created_at', 'updated_at'],
            PipelineStage: ['created_at', 'updated_at'],
            CustomField: ['created_at', 'updated_at'],
            Deal: ['created_at', 'updated_at', 'stage_entered_at'],
            DealCustomFieldValue: ['updated_at'],
            DealHistory: ['created_at'],
            Automation: ['created_at', 'updated_at'],
            DealTabulationTrigger: ['created_at'],
            UserPipelineConfig: ['created_at', 'updated_at'],
            CustomFieldGroup: ['created_at', 'updated_at'],
            ClientCustomField: ['created_at', 'updated_at'],
            ClientCustomFieldValue: ['created_at', 'updated_at'],
            Announcement: ['created_at', 'updated_at'],
            AnnouncementRead: ['read_at'],
            Tabulation: ['created_at', 'updated_at'],
            Tag: ['created_at', 'updated_at'],
            DealTag: ['assigned_at'],
            AuditLog: ['created_at'],
        };
    }
}



