import { Module, forwardRef } from '@nestjs/common';
import { QualificationsService } from './qualifications.service';
import { QualificationsController } from './qualifications.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { DealsModule } from '../deals/deals.module';

@Module({
    imports: [PrismaModule, forwardRef(() => DealsModule)],
    controllers: [QualificationsController],
    providers: [QualificationsService],
    exports: [QualificationsService],
})
export class QualificationsModule { }
