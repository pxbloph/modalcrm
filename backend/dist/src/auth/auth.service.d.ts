import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
export declare class AuthService {
    private usersService;
    private jwtService;
    constructor(usersService: UsersService, jwtService: JwtService);
    validateUser(email: string, pass: string): Promise<any>;
    login(user: any): Promise<{
        access_token: string;
        user: {
            id: any;
            name: any;
            email: any;
            role: any;
        };
    }>;
    register(data: any): Promise<{
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
