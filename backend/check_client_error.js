
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkClient() {
    try {
        const client = await prisma.client.findFirst({
            where: {
                OR: [
                    { cnpj: '4209151000161' },
                    { name: { contains: 'francisco menezes', mode: 'insensitive' } }
                ]
            },
            include: {
                deals: true,
                qualifications: true // To check if tabulacao matches "Conta aberta"
            }
        });

        console.log(JSON.stringify(client, null, 2));
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

checkClient();
