import { Module, forwardRef } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AutomationsModule } from '../automations/automations.module';
import { KanbanGateway } from './kanban.gateway';

import { ClientsModule } from '../clients/clients.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AutomationsModule), forwardRef(() => ClientsModule)],
  controllers: [DealsController],
  providers: [DealsService, KanbanGateway],
  exports: [DealsService, KanbanGateway],
})
export class DealsModule { }
