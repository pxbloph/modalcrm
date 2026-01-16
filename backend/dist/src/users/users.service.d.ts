import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
export declare class UsersService {
    private prisma;
    constructor(prisma: PrismaService);
    findOne(email: string): Promise<User | null>;
    findById(id: string): Promise<User | null>;
    create(data: any): Promise<User>;
    update(id: string, data: any): Promise<User>;
    remove(id: string, requestUserId?: string): Promise<User>;
    findAllSupervisors(): Promise<$Public.PrismaPromise<T>>;
    findAll(currentUser?: User): Promise<$Public.PrismaPromise<T>>;
    removeBulk(ids: string[], requestUserId: string): Promise<$Public.PrismaPromise<T>>;
    updateStatusBulk(ids: string[], isActive: boolean, requestUserId: string): Promise<$Public.PrismaPromise<T>>;
    updateSupervisorBulk(ids: string[], supervisorId: string | null, requestUserId: string): Promise<$Public.PrismaPromise<T>>;
}
