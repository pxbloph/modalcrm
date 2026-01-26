import { Module, forwardRef } from '@nestjs/common';
import { DealsService } from './deals.service';
import { DealsController } from './deals.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { AutomationsModule } from '../automations/automations.module';
import { KanbanGateway } from './kanban.gateway';

import { QualificationsModule } from '../qualifications/qualifications.module';

@Module({
  imports: [PrismaModule, forwardRef(() => AutomationsModule), forwardRef(() => QualificationsModule)],
  controllers: [DealsController],
  providers: [DealsService, KanbanGateway],
  exports: [DealsService, KanbanGateway],
})
export class DealsModule { }
