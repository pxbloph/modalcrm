
import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DealsModule } from '../deals/deals.module';

@Module({
    imports: [PrismaModule, DealsModule],
    controllers: [ClientsController],
    providers: [ClientsService],
})
export class ClientsModule { }
