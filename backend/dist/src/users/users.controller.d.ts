import { UsersService } from './users.service';
export declare class UsersController {
    private readonly usersService;
    constructor(usersService: UsersService);
    findAll(req: any): Promise<$Public.PrismaPromise<T>>;
    create(data: any, req: any): Promise<$Result.DefaultSelection<import(".prisma/client").Prisma.$UserPayload<$Extensions.DefaultArgs>>>;
    findOne(id: string, req: any): Promise<any>;
    update(id: string, data: any, req: any): Promise<$Result.DefaultSelection<import(".prisma/client").Prisma.$UserPayload<$Extensions.DefaultArgs>>>;
    remove(id: string, req: any): Promise<$Result.DefaultSelection<import(".prisma/client").Prisma.$UserPayload<$Extensions.DefaultArgs>>>;
    removeBulk(ids: string[], req: any): Promise<$Public.PrismaPromise<T>>;
    updateStatusBulk(body: {
        ids: string[];
        isActive: boolean;
    }, req: any): Promise<$Public.PrismaPromise<T>>;
    updateSupervisorBulk(body: {
        ids: string[];
        supervisorId: string | null;
    }, req: any): Promise<$Public.PrismaPromise<T>>;
}
