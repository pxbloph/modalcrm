const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient(); // No logs

async function run() {
    const startDateZ = new Date('2026-02-26T00:00:00.000Z');
    const endDateZ = new Date('2026-02-26T23:59:59.999Z');

    // Find Jonathan
    const user = await prisma.user.findFirst({
        where: { name: { contains: 'Jonathan', mode: 'insensitive' } }
    });

    if (!user) {
        console.log('Jonathan not found');
        return;
    }

    console.log('Jonathan ID:', user.id, user.name, user.surname);

    const accounts = await prisma.client.findMany({
        where: {
            account_opening_date: {
                gte: startDateZ,
                lte: endDateZ,
            },
            tabulacao: 'Conta aberta',
            created_by_id: user.id
        },
        select: {
            id: true,
            name: true,
            account_opening_date: true,
            tabulacao: true,
            integration_status: true
        }
    });

    console.log(`\nFound ${accounts.length} accounts for Jonathan today:`);
    console.table(accounts);

    const countSuccess = accounts.filter(a => a.integration_status === 'Cadastro salvo com sucesso!').length;
    console.log(`\nOut of those, ${countSuccess} have "Cadastro salvo com sucesso!"`);
}

run().catch(console.error).finally(() => prisma.$disconnect());
