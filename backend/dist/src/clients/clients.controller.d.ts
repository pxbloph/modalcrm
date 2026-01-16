import { ClientsService } from './clients.service';
export declare class ClientsController {
    private readonly clientsService;
    constructor(clientsService: ClientsService);
    create(createClientDto: any, req: any): Promise<$Result.GetResult<import(".prisma/client").Prisma.$ClientPayload<ExtArgs>, T, "create">>;
    getDashboardMetrics(req: any, query: any): Promise<{
        leads: any;
        accounts: any;
        pending: any;
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
    removeBulk(ids: string[], req: any): Promise<$Public.PrismaPromise<T>>;
    openAccountBulk(ids: string[], req: any): Promise<$Public.PrismaPromise<T>>;
    findAll(req: any, query: any): Promise<$Public.PrismaPromise<T>>;
    findOne(id: string, req: any): Promise<any>;
    update(id: string, updateClientDto: any, req: any): Promise<$Result.GetResult<import(".prisma/client").Prisma.$ClientPayload<ExtArgs>, T, "update">>;
    remove(id: string, req: any): Promise<$Result.GetResult<import(".prisma/client").Prisma.$ClientPayload<ExtArgs>, T, "delete">>;
    qualify(id: string, req: any): Promise<$Result.GetResult<import(".prisma/client").Prisma.$ClientPayload<ExtArgs>, T, "update">>;
    openAccount(id: string, req: any): Promise<$Result.GetResult<import(".prisma/client").Prisma.$ClientPayload<ExtArgs>, T, "update">>;
}
