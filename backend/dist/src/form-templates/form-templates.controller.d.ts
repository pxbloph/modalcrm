import { FormTemplatesService } from './form-templates.service';
export declare class FormTemplatesController {
    private readonly formTemplatesService;
    constructor(formTemplatesService: FormTemplatesService);
    create(data: {
        title: string;
        fields: any;
        type: string;
    }, req: any): Promise<$Result.GetResult<import(".prisma/client").Prisma.$FormTemplatePayload<ExtArgs>, T, "create">>;
    findActive(req: any): Promise<any>;
    findAll(req: any): Promise<$Public.PrismaPromise<T>>;
}
