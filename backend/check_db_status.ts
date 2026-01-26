
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkCounts() {
    try {
        console.log('Connecting to DB...');
        const users = await prisma.user.count();
        const clients = await prisma.client.count();
        const pipelines = await prisma.pipeline.count();
        const deals = await prisma.deal.count();
        const automations = await prisma.automation.count();

        console.log('--- DB COUNTS ---');
        console.log(`Users: ${users}`);
        console.log(`Clients: ${clients}`);
        console.log(`Pipelines: ${pipelines}`);
        console.log(`Deals: ${deals}`);
        console.log(`Automations: ${automations}`);
        console.log('-----------------');

    } catch (e) {
        console.error('Error connecting to DB:', e);
    } finally {
        await prisma.$disconnect();
    }
}

checkCounts();
