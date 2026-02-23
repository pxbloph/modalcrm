import { Module, forwardRef } from '@nestjs/common';
import { ClientsService } from './clients.service';
import { ClientsController } from './clients.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DealsModule } from '../deals/deals.module';
import { AutomationsModule } from '../automations/automations.module';
import { TabulationsModule } from '../tabulations/tabulations.module';
import { ResponsibilityModule } from '../modules/responsibility/responsibility.module';

@Module({
    imports: [
        PrismaModule,
        DealsModule,
        AutomationsModule,
        TabulationsModule,
        forwardRef(() => ResponsibilityModule)
    ],
    controllers: [ClientsController],
    providers: [ClientsService],
    exports: [ClientsService]
})
export class ClientsModule { }
