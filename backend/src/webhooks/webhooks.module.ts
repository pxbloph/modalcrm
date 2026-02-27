import { Module } from '@nestjs/common';
import { WebhooksController } from './webhooks.controller';
import { ClientsModule } from '../clients/clients.module';
import { UsersModule } from '../users/users.module';

@Module({
    imports: [ClientsModule, UsersModule],
    controllers: [WebhooksController],
})
export class WebhooksModule { }
