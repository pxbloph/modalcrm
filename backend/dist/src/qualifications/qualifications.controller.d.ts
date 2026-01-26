import { QualificationsService } from './qualifications.service';
export declare class QualificationsController {
    private readonly qualificationsService;
    constructor(qualificationsService: QualificationsService);
    getTemplate(): Promise<{
        id: string;
        is_active: boolean;
        created_at: Date;
        title: string;
        type: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
    }>;
    getTabulations(): Promise<any>;
    saveTemplate(body: any, req: any): Promise<{
        id: string;
        is_active: boolean;
        created_at: Date;
        title: string;
        type: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
    }> | {
        error: string;
    };
    create(clientId: string, body: any, req: any): Promise<{
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
}
