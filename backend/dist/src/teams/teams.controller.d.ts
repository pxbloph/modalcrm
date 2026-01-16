import { TeamsService } from './teams.service';
export declare class TeamsController {
    private readonly teamsService;
    constructor(teamsService: TeamsService);
    create(createTeamDto: {
        name: string;
        supervisorId: string;
        leaderId?: string;
    }): Promise<$Result.GetResult<import(".prisma/client").Prisma.$TeamPayload<ExtArgs>, T, "create">>;
    findAll(): Promise<$Public.PrismaPromise<T>>;
    findOne(id: string): Promise<any>;
    addMember(id: string, userId: string): Promise<$Result.GetResult<import(".prisma/client").Prisma.$UserPayload<ExtArgs>, T, "update">>;
    removeMember(id: string, userId: string): Promise<$Result.GetResult<import(".prisma/client").Prisma.$UserPayload<ExtArgs>, T, "update">>;
    update(id: string, updateTeamDto: {
        name?: string;
        supervisorId?: string;
        leaderId?: string;
    }): Promise<$Result.GetResult<import(".prisma/client").Prisma.$TeamPayload<ExtArgs>, T, "update">>;
    remove(id: string): Promise<$Result.GetResult<import(".prisma/client").Prisma.$TeamPayload<ExtArgs>, T, "delete">>;
}
