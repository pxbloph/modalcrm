import { PrismaService } from '../prisma/prisma.service';
import { DealsService } from '../deals/deals.service';
export declare class QualificationsService {
    private prisma;
    private dealsService;
    constructor(prisma: PrismaService, dealsService: DealsService);
    getActiveTemplate(): Promise<{
        id: string;
        is_active: boolean;
        created_at: Date;
        title: string;
        type: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getTabulationOptions(): Promise<any>;
    saveTemplate(fields: any): Promise<{
        id: string;
        is_active: boolean;
        created_at: Date;
        title: string;
        type: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
    }>;
    create(clientId: string, data: any, userId: string): Promise<{
        id: string;
        created_at: Date;
        client_id: string;
        answers: import("@prisma/client/runtime/library").JsonValue;
        emite_boletos: boolean | null;
        maquininha_atual: string | null;
        faturamento_maquina: import("@prisma/client/runtime/library").Decimal | null;
        faturamento_mensal: import("@prisma/client/runtime/library").Decimal | null;
        produto_interesse: string | null;
        deseja_receber_ofertas: boolean | null;
        informacoes_adicionais: string | null;
        nome_do_cliente: string | null;
        fase: string | null;
        tabulacao: string | null;
        agendamento: Date | null;
        integration_status: string | null;
        integration_attempts: number | null;
        last_integration_attempt: Date | null;
        webhook_response: string | null;
        created_by_id: string;
    }>;
    updateTabulation(clientId: string, newTabulation: string, user: any): Promise<{
        message: string;
        status: string;
        prior_tabulation?: undefined;
        new_tabulation?: undefined;
    } | {
        prior_tabulation: string;
        new_tabulation: string;
        message?: undefined;
        status?: undefined;
    }>;
    private buildAndSendWebhook;
    findByClient(clientId: string): Promise<({
        created_by: {
            name: string;
        };
    } & {
        id: string;
        created_at: Date;
        client_id: string;
        answers: import("@prisma/client/runtime/library").JsonValue;
        emite_boletos: boolean | null;
        maquininha_atual: string | null;
        faturamento_maquina: import("@prisma/client/runtime/library").Decimal | null;
        faturamento_mensal: import("@prisma/client/runtime/library").Decimal | null;
        produto_interesse: string | null;
        deseja_receber_ofertas: boolean | null;
        informacoes_adicionais: string | null;
        nome_do_cliente: string | null;
        fase: string | null;
        tabulacao: string | null;
        agendamento: Date | null;
        integration_status: string | null;
        integration_attempts: number | null;
        last_integration_attempt: Date | null;
        webhook_response: string | null;
        created_by_id: string;
    })[]>;
    private syncWithKanban;
}
