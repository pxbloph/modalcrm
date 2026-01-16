import { QualificationsService } from './qualifications.service';
export declare class QualificationsController {
    private readonly qualificationsService;
    constructor(qualificationsService: QualificationsService);
    getTemplate(): Promise<any>;
    saveTemplate(body: any, req: any): Promise<$Result.GetResult<import(".prisma/client").Prisma.$FormTemplatePayload<ExtArgs>, T, "create">> | {
        error: string;
    };
    create(clientId: string, body: any, req: any): Promise<any>;
    findByClient(clientId: string): Promise<$Public.PrismaPromise<T>>;
}
