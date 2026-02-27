const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('--- DETALHAMENTO: LEADS PONTUADOS (MAURICIO CAVALCANTE) ---');

    // Obter range de datas de hoje no fuso do Brasil (-03:00)
    const now = new Date();
    const brazilOffset = 3 * 60 * 60 * 1000;
    const brazilTime = new Date(now.getTime() - brazilOffset);
    let queryDateString = brazilTime.toISOString().split('T')[0];

    const startDate = new Date(`${queryDateString}T00:00:00.000Z`);
    const endDate = new Date(`${queryDateString}T23:59:59.999Z`);

    // Consulta focada na tabela de Deals (responsabilidade) para Mauricio
    const validDeals = await prisma.deal.findMany({
        where: {
            client: {
                account_opening_date: {
                    gte: startDate,
                    lte: endDate,
                },
                tabulacao: 'Conta aberta',
                integration_status: 'Cadastro salvo com sucesso!',
            },
            responsible: {
                name: { contains: 'Mauricio', mode: 'insensitive' }
            }
        },
        select: {
            client: {
                select: {
                    name: true,
                    cnpj: true,
                    tabulacao: true,
                    account_opening_date: true,
                    created_by: { select: { name: true, surname: true } }
                }
            },
            responsible: {
                select: { name: true, surname: true }
            }
        },
        orderBy: { client: { account_opening_date: 'asc' } }
    });

    console.log(`\nEncontrados ${validDeals.length} negócios associados à conta do Mauricio hoje. Detalhando autoria e responsabilidade:\n`);

    validDeals.forEach((deal, index) => {
        const client = deal.client;

        const creatorName = client && client.created_by
            ? `${client.created_by.name} ${client.created_by.surname || ''}`.trim()
            : 'Desconhecido';

        const responsibleName = deal.responsible
            ? `${deal.responsible.name} ${deal.responsible.surname || ''}`.trim()
            : 'Nenhum / Não atribuído';

        console.log(`${index + 1}. NOME DO LEAD: ${client?.name || 'Vazio'}`);
        console.log(`   - DATA ABERTURA: ${client?.account_opening_date ? client.account_opening_date.toISOString() : 'Data Nula'}`);
        console.log(`   - QUEM CADASTROU (CREATED_BY): ${creatorName}`);
        console.log(`   - DONO DO CARD (RESPONSIBLE): ${responsibleName}`);
        console.log('---');
    });

}

run().catch(console.error).finally(() => prisma.$disconnect());
