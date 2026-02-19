import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { TvDashboardController } from './tv-dashboard.controller';
import { TvDashboardService } from './tv-dashboard.service';

@Module({
    imports: [PrismaModule],
    controllers: [TvDashboardController],
    providers: [TvDashboardService],
})
export class DashboardsModule { }
