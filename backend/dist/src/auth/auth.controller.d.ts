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
    register(body: any): Promise<{
        id: string;
        name: string;
        surname: string | null;
        cpf: string | null;
        email: string;
        password_hash: string;
        role: import(".prisma/client").$Enums.Role;
        is_active: boolean;
        created_at: Date;
        supervisor_id: string | null;
        team_id: string | null;
    }>;
    getProfile(req: any): any;
}
