
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const statuses = await prisma.client.groupBy({
            by: ['integration_status'],
            _count: {
                integration_status: true
            }
        });
        console.log("Distinct Statuses:", JSON.stringify(statuses, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
