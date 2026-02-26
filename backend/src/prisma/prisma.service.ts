import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {

    constructor() {
        super();
        // Middleware para interceptar criações/atualizações e subtrair 3 horas das datas 
        // para que o Prisma (que envia sempre como UTC absoluto) faça o banco armazenar
        // com a "cara" da hora do Brasil.
        this.$use(async (params, next) => {
            if (['create', 'update', 'createMany', 'updateMany', 'upsert'].includes(params.action)) {
                this.injectTimestamps(params);
                this.shiftDatesRecursively(params.args);
            }
            const result = await next(params);

            // Opcional: Deslocar de volta a leitura (Se o banco devolver o número "cru", 
            // no JS pode ficar 3 horas diferente do esperado se não voltarmos).
            // Apenas leitura (find)
            if (['findUnique', 'findFirst', 'findMany'].includes(params.action) && result) {
                this.shiftDatesRecursivelyRead(result);
            }

            return result;
        });
    }

    async onModuleInit() {
        await this.$connect();
        // Opcionalmente forçar a timezone transacionalmente neste pool, 
        // mas o Prisma client não mantém sessões vivas fixas a menos que via transaction.
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    // Função para descer a hora antes de enviar pro banco
    private shiftDatesRecursively(obj: any) {
        if (!obj || typeof obj !== 'object') return;

        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (value instanceof Date) {
                // Diminui 3 horas. Quando o Prisma converter para string UTC, ele vai mandar 
                // para o Postgres algo como '23:00' (que era o real do Brasil) em vez de '02:00'.
                obj[key] = new Date(value.getTime() - (3 * 60 * 60 * 1000));
            } else if (typeof value === 'object') {
                this.shiftDatesRecursively(value);
            }
        }
    }

    // Função para subir a hora quando o banco cruzar os dados de volta
    private shiftDatesRecursivelyRead(obj: any) {
        if (!obj || typeof obj !== 'object') return;

        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (value instanceof Date) {
                // Na leitura, ele vai voltar reduzido em 3h, então repomos pra o JS ficar feliz.
                obj[key] = new Date(value.getTime() + (3 * 60 * 60 * 1000));
            } else if (typeof value === 'object') {
                this.shiftDatesRecursivelyRead(value);
            }
        }
    }

    // Injeta as datas manualmente antes do Prisma Engine gerar silenciosamente em UTC puro
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
            AuditLog: ['created_at']
        };
    }
}
