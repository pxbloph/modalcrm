import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationsService } from './automations.service';

@Injectable()
export class SlaScheduler {
    private readonly logger = new Logger(SlaScheduler.name);

    constructor(
        private readonly prisma: PrismaService,
        private readonly automationsService: AutomationsService,
    ) { }

    @Cron(CronExpression.EVERY_MINUTE)
    async handleCron() {
        // Logic commented out to prevent error spam during debug
        return;
    }
}
