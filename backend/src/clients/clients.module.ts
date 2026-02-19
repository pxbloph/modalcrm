
import { Module } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DealsModule } from '../deals/deals.module';
import { AutomationsModule } from '../automations/automations.module';
import { TabulationsModule } from '../tabulations/tabulations.module';

@Module({
    imports: [PrismaModule, DealsModule, AutomationsModule, TabulationsModule],
    controllers: [ClientsController],
    providers: [ClientsService],
})
export class ClientsModule { }
