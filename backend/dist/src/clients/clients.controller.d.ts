import { ClientsService } from './clients.service';
export declare class ClientsController {
    private readonly clientsService;
    constructor(clientsService: ClientsService);
    create(createClientDto: any, req: any): Promise<{
        id: string;
        email: string;
        name: string;
        surname: string | null;
        created_at: Date;
        cnpj: string;
        phone: string;
        is_qualified: boolean;
        has_open_account: boolean;
        answers: import("@prisma/client/runtime/library").JsonValue | null;
        integration_status: string;
        updated_at: Date;
        id_bitrix: number | null;
        created_by_id: string;
    }>;
    getDashboardMetrics(req: any, query: any): Promise<{
        leads: number;
        accounts: number;
        pending: number;
        conversionRate: number;
    }>;
    getNotifications(req: any): Promise<{
        clientName: any;
        contactName: any;
        clientId: any;
        scheduleTime: any;
        phone: any;
        email: any;
        cnpj: any;
    }[]>;
    removeBulk(ids: string[], req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    openAccountBulk(ids: string[], req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    findAll(req: any, query: any): Promise<({
        qualifications: {
            tabulacao: string;
            agendamento: Date;
        }[];
        created_by: {
            email: string;
            name: string;
        };
    } & {
        id: string;
        email: string;
        name: string;
        surname: string | null;
        created_at: Date;
        cnpj: string;
        phone: string;
        is_qualified: boolean;
        has_open_account: boolean;
        answers: import("@prisma/client/runtime/library").JsonValue | null;
        integration_status: string;
        updated_at: Date;
        id_bitrix: number | null;
        created_by_id: string;
    })[]>;
    findOne(id: string, req: any): Promise<{
        qualifications: {
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
        }[];
        created_by: {
            id: string;
            cpf: string | null;
            email: string;
            name: string;
            surname: string | null;
            password_hash: string;
            role: import(".prisma/client").$Enums.Role;
            is_active: boolean;
            created_at: Date;
            supervisor_id: string | null;
            team_id: string | null;
        };
    } & {
        id: string;
        email: string;
        name: string;
        surname: string | null;
        created_at: Date;
        cnpj: string;
        phone: string;
        is_qualified: boolean;
        has_open_account: boolean;
        answers: import("@prisma/client/runtime/library").JsonValue | null;
        integration_status: string;
        updated_at: Date;
        id_bitrix: number | null;
        created_by_id: string;
    }>;
    update(id: string, updateClientDto: any, req: any): Promise<{
        id: string;
        email: string;
        name: string;
        surname: string | null;
        created_at: Date;
        cnpj: string;
        phone: string;
        is_qualified: boolean;
        has_open_account: boolean;
        answers: import("@prisma/client/runtime/library").JsonValue | null;
        integration_status: string;
        updated_at: Date;
        id_bitrix: number | null;
        created_by_id: string;
    }>;
    remove(id: string, req: any): Promise<{
        id: string;
        email: string;
        name: string;
        surname: string | null;
        created_at: Date;
        cnpj: string;
        phone: string;
        is_qualified: boolean;
        has_open_account: boolean;
        answers: import("@prisma/client/runtime/library").JsonValue | null;
        integration_status: string;
        updated_at: Date;
        id_bitrix: number | null;
        created_by_id: string;
    }>;
    qualify(id: string, req: any): Promise<{
        id: string;
        email: string;
        name: string;
        surname: string | null;
        created_at: Date;
        cnpj: string;
        phone: string;
        is_qualified: boolean;
        has_open_account: boolean;
        answers: import("@prisma/client/runtime/library").JsonValue | null;
        integration_status: string;
        updated_at: Date;
        id_bitrix: number | null;
        created_by_id: string;
    }>;
    openAccount(id: string, req: any): Promise<{
        id: string;
        email: string;
        name: string;
        surname: string | null;
        created_at: Date;
        cnpj: string;
        phone: string;
        is_qualified: boolean;
        has_open_account: boolean;
        answers: import("@prisma/client/runtime/library").JsonValue | null;
        integration_status: string;
        updated_at: Date;
        id_bitrix: number | null;
        created_by_id: string;
    }>;
}
