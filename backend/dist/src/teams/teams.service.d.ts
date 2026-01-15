import { PrismaService } from '../prisma/prisma.service';
export declare class TeamsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        name: string;
        supervisorId: string;
        leaderId?: string;
    }): Promise<{
        id: string;
        name: string;
        created_at: Date;
        supervisor_id: string;
        updated_at: Date;
        leader_id: string | null;
    }>;
    update(id: string, data: {
        name?: string;
        supervisorId?: string;
        leaderId?: string;
    }): Promise<{
        id: string;
        name: string;
        created_at: Date;
        supervisor_id: string;
        updated_at: Date;
        leader_id: string | null;
    }>;
    remove(id: string): Promise<{
        id: string;
        name: string;
        created_at: Date;
        supervisor_id: string;
        updated_at: Date;
        leader_id: string | null;
    }>;
    findAll(): Promise<({
        supervisor: {
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
        };
        _count: {
            members: number;
        };
        leader: {
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
        };
    } & {
        id: string;
        name: string;
        created_at: Date;
        supervisor_id: string;
        updated_at: Date;
        leader_id: string | null;
    })[]>;
    findOne(id: string): Promise<{
        metrics: {
            leads: number;
            contas: number;
            pendentes: number;
            conversao: number;
        };
        supervisor: {
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
        };
        leader: {
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
        };
        members: {
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
        }[];
        id: string;
        name: string;
        created_at: Date;
        supervisor_id: string;
        updated_at: Date;
        leader_id: string | null;
    }>;
    addMember(teamId: string, userId: string): Promise<{
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
    removeMember(teamId: string, userId: string): Promise<{
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
}
