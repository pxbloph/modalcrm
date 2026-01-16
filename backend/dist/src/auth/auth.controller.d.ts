import { AuthService } from './auth.service';
export declare class AuthController {
    private authService;
    constructor(authService: AuthService);
    login(req: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
        };
    } | {
        message: string;
    }>;
    register(body: any): Promise<$Result.DefaultSelection<import(".prisma/client").Prisma.$UserPayload<$Extensions.DefaultArgs>>>;
    getProfile(req: any): any;
}
