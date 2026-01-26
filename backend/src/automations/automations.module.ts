import { Module, forwardRef } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { AutomationsController } from './automations.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DealsModule } from '../deals/deals.module';

import { SlaScheduler } from './sla.scheduler';

@Module({
    imports: [PrismaModule, forwardRef(() => DealsModule)],
    controllers: [AutomationsController],
    providers: [AutomationsService, SlaScheduler],
    exports: [AutomationsService],
})
export class AutomationsModule { }
