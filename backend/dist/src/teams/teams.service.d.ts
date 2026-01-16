import { PrismaService } from '../prisma/prisma.service';
export declare class TeamsService {
    private prisma;
    constructor(prisma: PrismaService);
    create(data: {
        name: string;
        supervisorId: string;
        leaderId?: string;
    }): Promise<$Result.GetResult<import(".prisma/client").Prisma.$TeamPayload<ExtArgs>, T, "create">>;
    update(id: string, data: {
        name?: string;
        supervisorId?: string;
        leaderId?: string;
    }): Promise<$Result.GetResult<import(".prisma/client").Prisma.$TeamPayload<ExtArgs>, T, "update">>;
    remove(id: string): Promise<$Result.GetResult<import(".prisma/client").Prisma.$TeamPayload<ExtArgs>, T, "delete">>;
    findAll(): Promise<$Public.PrismaPromise<T>>;
    findOne(id: string): Promise<any>;
    addMember(teamId: string, userId: string): Promise<$Result.GetResult<import(".prisma/client").Prisma.$UserPayload<ExtArgs>, T, "update">>;
    removeMember(teamId: string, userId: string): Promise<$Result.GetResult<import(".prisma/client").Prisma.$UserPayload<ExtArgs>, T, "update">>;
}
