import { PrismaService } from '../prisma/prisma.service';
export declare class FormTemplatesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        title: string;
        fields: any;
        type: string;
    }): Promise<$Result.GetResult<import(".prisma/client").Prisma.$FormTemplatePayload<ExtArgs>, T, "create">>;
    findActive(type?: string): Promise<any>;
    findAll(): Promise<$Public.PrismaPromise<T>>;
}
