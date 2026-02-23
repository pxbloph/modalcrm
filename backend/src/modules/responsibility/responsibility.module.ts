import { Module, forwardRef } from '@nestjs/common';
import { ResponsibilityService } from './responsibility.service';
import { ResponsibilityController } from './responsibility.controller';
import { PrismaModule } from '../../prisma/prisma.module';
import { AuditModule } from '../audit/audit.module';
import { ClientsModule } from '../../clients/clients.module';
import { DealsModule } from '../../deals/deals.module';

@Module({
    imports: [
        PrismaModule,
        AuditModule,
        forwardRef(() => ClientsModule), // To update owner
        DealsModule    // To update responsible
    ],
    controllers: [ResponsibilityController],
    providers: [ResponsibilityService],
    exports: [ResponsibilityService]
})
export class ResponsibilityModule { }
