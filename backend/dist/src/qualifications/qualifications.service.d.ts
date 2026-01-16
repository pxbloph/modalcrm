import { PrismaService } from '../prisma/prisma.service';
export declare class QualificationsService {
    private prisma;
    constructor(prisma: PrismaService);
    getActiveTemplate(): Promise<any>;
    saveTemplate(fields: any): Promise<$Result.GetResult<import(".prisma/client").Prisma.$FormTemplatePayload<ExtArgs>, T, "create">>;
    create(clientId: string, data: any, userId: string): Promise<any>;
    findByClient(clientId: string): Promise<$Public.PrismaPromise<T>>;
}
