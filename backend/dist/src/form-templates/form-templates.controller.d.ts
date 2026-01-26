import { FormTemplatesService } from './form-templates.service';
export declare class FormTemplatesController {
    private readonly formTemplatesService;
    constructor(formTemplatesService: FormTemplatesService);
    create(data: {
        title: string;
        fields: any;
        type: string;
    }, req: any): Promise<{
        id: string;
        is_active: boolean;
        created_at: Date;
        title: string;
        type: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
    }>;
    findActive(req: any): Promise<{
        id: string;
        is_active: boolean;
        created_at: Date;
        title: string;
        type: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
    }>;
    findAll(req: any): Promise<{
        id: string;
        is_active: boolean;
        created_at: Date;
        title: string;
        type: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
}
