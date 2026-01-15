import { PrismaService } from '../prisma/prisma.service';
import { User, Prisma } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findOne(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    create(data: any): Promise<User>;
    update(id: string, data: any): Promise<User>;
    remove(id: string, requestUserId?: string): Promise<User>;
    findAllSupervisors(): Promise<{
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
    }[]>;
    findAll(): Promise<({
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
    removeBulk(ids: string[], requestUserId: string): Promise<Prisma.BatchPayload>;
    updateStatusBulk(ids: string[], isActive: boolean, requestUserId: string): Promise<Prisma.BatchPayload>;
}
