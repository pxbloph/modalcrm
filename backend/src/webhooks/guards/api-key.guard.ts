import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class ApiKeyGuard implements CanActivate {
    constructor(private prisma: PrismaService) { }

    async canActivate(context: ExecutionContext): Promise<boolean> {
        const request = context.switchToHttp().getRequest();
        const apiKeyHeader = request.headers['x-api-key'];

        if (!apiKeyHeader) {
            throw new UnauthorizedException('X-API-KEY ausente no cabeçalho.');
        }

        // Busca a chave no banco de dados
        const validKey = await this.prisma.apiKey.findUnique({
            where: { key: apiKeyHeader }
        });

        if (!validKey || !validKey.is_active) {
            throw new UnauthorizedException('X-API-KEY inválida ou inativa.');
        }

        // Atualiza o last_used_at silenciosamente (fire and forget ou await rápido)
        await this.prisma.apiKey.update({
            where: { id: validKey.id },
            data: { last_used_at: new Date() }
        }).catch(e => console.error("Erro ao atualizar uso da API Key", e));

        return true; // Acesso liberado
    }
}
