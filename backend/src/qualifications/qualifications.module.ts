import { Module, forwardRef } from '@nestjs/common';
import { QualificationsService } from './qualifications.service';
import { QualificationsController } from './qualifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DealsModule } from '../deals/deals.module';
import { TabulationsModule } from '../tabulations/tabulations.module';

@Module({
    imports: [PrismaModule, forwardRef(() => DealsModule), TabulationsModule],
    controllers: [QualificationsController],
    providers: [QualificationsService],
    exports: [QualificationsService],
})
export class QualificationsModule { }
