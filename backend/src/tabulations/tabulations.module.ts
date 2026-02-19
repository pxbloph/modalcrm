import { Module } from '@nestjs/common';
import { TabulationsController } from './tabulations.controller';
import { TabulationsService } from './tabulations.service';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [TabulationsController],
    providers: [TabulationsService],
    exports: [TabulationsService],
})
export class TabulationsModule { }
