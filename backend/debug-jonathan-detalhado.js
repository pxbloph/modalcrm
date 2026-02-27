const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('--- DETALHAMENTO: LEADS PONTUADOS (JONATHAN) ---');

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
            name: true,
            cnpj: true,
            tabulacao: true,
            account_opening_date: true,
            created_by: {
                select: { name: true, surname: true }
            },
            deals: {
                select: {
                    responsible: { select: { name: true, surname: true } }
                }
            }
        },
        orderBy: { account_opening_date: 'asc' }
    });

    console.log(`\nEncontrados ${leads.length} leads. Comparando autoria e responsabilidade:\n`);

    leads.forEach((l, index) => {
        const creatorName = l.created_by
            ? `${l.created_by.name} ${l.created_by.surname || ''}`.trim()
            : 'Desconhecido';

        const responsibleName = l.deals.length > 0 && l.deals[0].responsible
            ? `${l.deals[0].responsible.name} ${l.deals[0].responsible.surname || ''}`.trim()
            : 'Nenhum / Não atribuído';

        console.log(`${index + 1}. NOME DO LEAD: ${l.name}`);
        console.log(`   - DATA ABERTURA: ${l.account_opening_date.toISOString()}`);
        console.log(`   - QUEM CADASTROU (CREATED_BY): ${creatorName}`);
        console.log(`   - DONO DO CARD (RESPONSIBLE): ${responsibleName}`);
        console.log('---');
    });

}

run().catch(console.error).finally(() => prisma.$disconnect());
