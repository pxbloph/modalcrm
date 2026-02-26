const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('--- BUSCANDO LEADS DA YNAIMARA DE HOJE ---');

    // Buscar todos os leads associados à Ynaimara criados OU com abertura de conta em 25 ou 26
    const leads = await prisma.client.findMany({
        where: {
            OR: [
                { account_opening_date: { gte: new Date('2026-02-24T00:00:00Z') } },
                { created_at: { gte: new Date('2026-02-24T00:00:00Z') } }
            ],
            deals: {
                some: {
                    responsible: { name: { contains: 'Ynaimara', mode: 'insensitive' } }
                }
            }
        },
        select: {
            name: true,
            cnpj: true,
            tabulacao: true,
            integration_status: true,
            created_at: true,
            account_opening_date: true
        }
    });

    console.log(`Encontrados ${leads.length} leads vinculados a Ynaimara nos últimos 2 dias.`);

    leads.forEach(l => {
        console.log(`Cliente: ${l.name} | CNPJ: ${l.cnpj}`);
        console.log(`   - Tabulacao: ${l.tabulacao}`);
        console.log(`   - Status Integrado: ${l.integration_status}`);
        console.log(`   - Created_at (Banco Cru): ${l.created_at?.toISOString()}`);
        console.log(`   - Account_Opening_date (Banco Cru): ${l.account_opening_date?.toISOString()}`);
        console.log('---');
    });

}

run().catch(console.error).finally(() => prisma.$disconnect());
