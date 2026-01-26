import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(req: any): Promise<({
        supervisor: {
            name: string;
        };
    } & {
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
    })[]>;
    getChatAssociates(req: any): Promise<{
        id: string;
        email: string;
        name: string;
        surname: string;
        role: import(".prisma/client").$Enums.Role;
    }[]>;
    create(data: any, req: any): Promise<{
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
    }>;
    findOne(id: string, req: any): Promise<{
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
    }>;
    update(id: string, data: any, req: any): Promise<{
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
    }>;
    remove(id: string, req: any): Promise<{
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
    }>;
    removeBulk(ids: string[], req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    updateStatusBulk(body: {
        ids: string[];
        isActive: boolean;
    }, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
    updateSupervisorBulk(body: {
        ids: string[];
        supervisorId: string | null;
    }, req: any): Promise<import(".prisma/client").Prisma.BatchPayload>;
}
