import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
export declare class ClientsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: Prisma.ClientCreateInput, user: User): Promise<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "create">>;
    private buildFilterConditions;
    findAll(user: User, query?: any): Promise<$Public.PrismaPromise<T>>;
    update(id: string, data: Prisma.ClientUpdateInput, user: User): Promise<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "update">>;
    remove(id: string, user: User): Promise<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "delete">>;
    qualify(id: string, user: User): Promise<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "update">>;
    openAccount(id: string, user: User): Promise<$Result.GetResult<Prisma.$ClientPayload<ExtArgs>, T, "update">>;
    getDashboardMetrics(user: User, query?: any): Promise<{
        leads: any;
        accounts: any;
        pending: any;
        conversionRate: number;
    }>;
    findOne(id: string, user: User): Promise<any>;
    checkNotifications(user: User): Promise<{
        clientName: any;
        contactName: any;
        clientId: any;
        scheduleTime: any;
        phone: any;
        email: any;
        cnpj: any;
    }[]>;
    removeBulk(ids: string[], user: User): Promise<$Public.PrismaPromise<T>>;
    openAccountBulk(ids: string[], user: User): Promise<$Public.PrismaPromise<T>>;
}
