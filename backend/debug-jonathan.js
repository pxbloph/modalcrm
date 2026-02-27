const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('--- BUSCANDO LEADS PONTUADOS PARA O JONATHAN HOJE ---');

    // Obter range de datas de hoje no fuso do Brasil (-03:00)
    const now = new Date();
    const brazilOffset = 3 * 60 * 60 * 1000;
    const brazilTime = new Date(now.getTime() - brazilOffset);
    let queryDateString = brazilTime.toISOString().split('T')[0];

    const startDate = new Date(`${queryDateString}T00:00:00.000Z`);
    const endDate = new Date(`${queryDateString}T23:59:59.999Z`);

    const leads = await prisma.client.findMany({
        where: {
            account_opening_date: {
                gte: startDate,
                lte: endDate,
            },
            tabulacao: 'Conta aberta',
            integration_status: 'Cadastro salvo com sucesso!',
            created_by: {
                name: { contains: 'Jonathan', mode: 'insensitive' }
            }
        },
        select: {
            id: true,
            name: true,
            cnpj: true,
            account_opening_date: true,
            created_at: true,
            created_by: { select: { name: true, surname: true } }
        },
        orderBy: { account_opening_date: 'asc' }
    });

    console.log(`\nEncontrados ${leads.length} leads computados sob o CREATED_BY_ID do Jonathan para o dia ${queryDateString}:`);

    leads.forEach((l, index) => {
        console.log(`\n${index + 1}. Cliente: ${l.name}`);
        console.log(`   - CNPJ: ${l.cnpj}`);
        console.log(`   - Criador: ${l.created_by.name} ${l.created_by.surname || ''}`);
        console.log(`   - Abertura de Conta: ${l.account_opening_date.toISOString()}`);
        console.log(`   - Criado Em (Lead Original): ${l.created_at.toISOString()}`);
    });

}

run().catch(console.error).finally(() => prisma.$disconnect());
