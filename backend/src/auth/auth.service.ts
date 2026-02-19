import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../modules/audit/audit.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private auditService: AuditService,
    ) { }

    async validateUser(email: string, pass: string): Promise<any> {
        const user = await this.usersService.findOne(email);
        if (user && (await bcrypt.compare(pass, user.password_hash))) {
            const { password_hash, ...result } = user;
            return result;
        }

        // Log failed attempt
        this.auditService.log({
            level: 'WARN',
            event_type: 'AUTH_FAILURE',
            entity_type: 'USER',
            entity_id: email, // Usar email como ID se user não existe ou não foi achado
            action: 'LOGIN_FAILED',
            before: null,
            after: null,
            metadata: { reason: user ? 'Invalid Password' : 'User Not Found' }
        });

        return null;
    }

    async login(user: any) {
        // Log successful login
        this.auditService.log({
            level: 'INFO',
            event_type: 'AUTH_LOGIN',
            entity_type: 'USER',
            entity_id: user.id,
            action: 'LOGIN_SUCCESS',
            before: null,
            after: null,
            metadata: { role: user.role }
        });

        const payload = { email: user.email, sub: user.id, role: user.role };
        return {
            access_token: this.jwtService.sign(payload),
            user: {
                id: user.id,
                name: user.name,
                email: user.email,
                role: user.role,
            },
        };
    }

    async register(data: any) {
        // Basic registration, consider using DTOs and validating existence
        return this.usersService.create({
            ...data,
            password_hash: data.password, // Will be hashed in UsersService
        });
    }
}
