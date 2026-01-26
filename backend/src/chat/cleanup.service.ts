
import { Injectable, Logger } from '@nestjs/common';
import { Cron, CronExpression } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CleanupService {
    private readonly logger = new Logger(CleanupService.name);

    constructor(private prisma: PrismaService) { }

    @Cron(CronExpression.EVERY_DAY_AT_MIDNIGHT)
    async handleCleanup() {
        this.logger.log('Running chat cleanup...');
        const sevenDaysAgo = new Date();
        sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

        try {
            const result = await this.prisma.message.deleteMany({
                where: {
                    created_at: {
                        lt: sevenDaysAgo,
                    },
                },
            });
            this.logger.log(`Cleanup complete. Deleted ${result.count} messages.`);
        } catch (error) {
            this.logger.error('Failed to cleanup messages', error);
        }
    }
}
