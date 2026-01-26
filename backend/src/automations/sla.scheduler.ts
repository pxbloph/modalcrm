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
    async checkSlas() {
        this.logger.debug('Checking SLA breaches...');

        // 1. Get stages with active SLA
        const stagesWithSla = await this.prisma.pipelineStage.findMany({
            where: {
                sla_minutes: { gt: 0 },
                is_active: true,
            },
        });

        for (const stage of stagesWithSla) {
            if (!stage.sla_minutes) continue;

            const cutoffTime = new Date(Date.now() - stage.sla_minutes * 60 * 1000);

            // 2. Find Deals active in this stage, entered before cutoff, and NOT marked as overdue
            const deals = await this.prisma.deal.findMany({
                where: {
                    stage_id: stage.id,
                    status: 'OPEN',
                    stage_entered_at: { lt: cutoffTime },
                    is_overdue: false,
                },
            });

            if (deals.length > 0) {
                this.logger.log(`Found ${deals.length} deals breaching SLA in stage ${stage.name}`);

                for (const deal of deals) {
                    // Mark as overdue
                    await this.prisma.deal.update({
                        where: { id: deal.id },
                        data: { is_overdue: true },
                    });

                    // Trigger Automation
                    await this.automationsService.processTriggers(deal.id, 'SLA_BREACH', {
                        pipeline_id: deal.pipeline_id,
                        stage_id: deal.stage_id,
                        sla_minutes: stage.sla_minutes
                    });
                }
            }
        }
    }
}
