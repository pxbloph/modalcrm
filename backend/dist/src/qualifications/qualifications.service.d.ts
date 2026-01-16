import { PrismaService } from '../prisma/prisma.service';
export declare class QualificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    getActiveTemplate(): Promise<{
        id: string;
        is_active: boolean;
        created_at: Date;
        title: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
        type: string;
    }>;
    saveTemplate(fields: any): Promise<{
        id: string;
        is_active: boolean;
        created_at: Date;
        title: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
        type: string;
    }>;
    create(clientId: string, data: any, userId: string): Promise<{
        integration_status: string;
        id: string;
        created_at: Date;
        answers: import("@prisma/client/runtime/library").JsonValue;
        created_by_id: string;
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
        integration_attempts: number | null;
        last_integration_attempt: Date | null;
        webhook_response: string | null;
        client_id: string;
    }>;
    findByClient(clientId: string): Promise<({
        created_by: {
            name: string;
        };
    } & {
        id: string;
        created_at: Date;
        answers: import("@prisma/client/runtime/library").JsonValue;
        integration_status: string | null;
        created_by_id: string;
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
        integration_attempts: number | null;
        last_integration_attempt: Date | null;
        webhook_response: string | null;
        client_id: string;
    })[]>;
}
