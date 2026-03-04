import { Controller, Post, Body, UseGuards, HttpException, HttpStatus } from '@nestjs/common';
import { ClientsService } from '../clients/clients.service';
import { ApiKeyGuard } from './guards/api-key.guard';
import { CreateN8nClientDto } from './dto/create-n8n-client.dto';
import { UsersService } from '../users/users.service';
import { Role } from '@prisma/client';
import { Throttle } from '@nestjs/throttler';

@Controller('webhooks')
export class WebhooksController {
    constructor(
        private readonly clientsService: ClientsService,
        private readonly usersService: UsersService,
    ) { }

    @Post('n8n/clients')
    @UseGuards(ApiKeyGuard)
    @Throttle({ webhook: { limit: 200, ttl: 60000 } })
    async createClientFromN8n(@Body() body: CreateN8nClientDto) {
        try {
            // 1. Determinar quem será o "dono" (created_by) do lead criado pelo n8n
            let ownerId = body.created_by_id;

            if (!ownerId) {
                const admin = await this.usersService.findFirstAdmin();

                if (!admin) {
                    throw new HttpException('Nenhum usuário ADMIN disponível para assunção do lead do webhook.', HttpStatus.INTERNAL_SERVER_ERROR);
                }
                ownerId = admin.id;
            }

            // Hack para o ClientsService: simular o "user" req.user que chama o serviço normalmente
            // Como o webhook é server-to-server, assumimos poder de ADMIN neste endpoint
            const systemUserMock = {
                id: ownerId, // Assumimos em nome desse cara
                role: Role.ADMIN // ADMIN burla regras restritas no service
            } as any;

            // Mapeamento extra se o payload enviar tabulação, garantir que seja tratado.
            // O CreateN8nClientDto já inclui tabulação e outros itens mapeados direto por causa do destructuring no ClientsService.

            const client = await this.clientsService.create({
                ...body,
                created_by_id: ownerId, // Forçamos o ID (mesmo o Role.ADMIN fará o serviço respeitá-lo)
            } as any, systemUserMock);

            return {
                success: true,
                message: 'Cliente e Negócio criados com sucesso via n8n.',
                client_id: client.id
            };

        } catch (error) {
            console.error('[WEBHOOK N8N] Erro ao criar cliente:', error.message);
            throw new HttpException(
                error.message || 'Erro interno ao processar webhook',
                error.status || HttpStatus.INTERNAL_SERVER_ERROR
            );
        }
    }
}
