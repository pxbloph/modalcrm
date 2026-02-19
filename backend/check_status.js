
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const client = await prisma.client.findFirst({
            where: { cnpj: '4209151000161' }
        });
        if (!client) {
            console.log("Client not found");
        } else {
            console.log("STATUS:", client.integration_status);
            console.log("MESSAGE:", client.integration_message);
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
