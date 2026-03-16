import { Injectable, UnauthorizedException } from '@nestjs/common';
import { UsersService } from '../users/users.service';
import { JwtService } from '@nestjs/jwt';
import * as bcrypt from 'bcrypt';
import { AuditService } from '../modules/audit/audit.service';
import { SecurityService } from '../security/security.service';

@Injectable()
export class AuthService {
    constructor(
        private usersService: UsersService,
        private jwtService: JwtService,
        private auditService: AuditService,
        private securityService: SecurityService,
    ) { }

    private async buildAuthUser(user: any) {
        const permissions = await this.securityService.getEffectivePermissionsByUserId(user.id);
        const systemSettings = await this.securityService.getPublicSystemSettings();
        const initialPage = await this.securityService.getResolvedInitialPageByUserId(user.id);

        return {
            id: user.id,
            name: user.name,
            email: user.email,
            role: user.role,
            permissions,
            initial_page: initialPage,
            system_settings: systemSettings,
        };
    }

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
        const authUser = await this.buildAuthUser(user);

        return {
            access_token: this.jwtService.sign(payload),
            user: authUser,
        };
    }

    async getProfile(userId: string) {
        const user = await this.usersService.findById(userId);
        if (!user) {
            throw new UnauthorizedException('Usuário não encontrado.');
        }

        return this.buildAuthUser(user);
    }

    async register(data: any) {
        // Basic registration, consider using DTOs and validating existence
        return this.usersService.create({
            ...data,
            password_hash: data.password, // Will be hashed in UsersService
        });
    }
}
