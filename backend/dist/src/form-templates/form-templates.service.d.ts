import { PrismaService } from '../prisma/prisma.service';
export declare class FormTemplatesService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        title: string;
        fields: any;
        type: string;
    }): Promise<{
        id: string;
        is_active: boolean;
        created_at: Date;
        title: string;
        type: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
    }>;
    findActive(type?: string): Promise<{
        id: string;
        is_active: boolean;
        created_at: Date;
        title: string;
        type: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
    }>;
    findAll(): Promise<{
        id: string;
        is_active: boolean;
        created_at: Date;
        title: string;
        type: string;
        fields: import("@prisma/client/runtime/library").JsonValue;
    }[]>;
}
