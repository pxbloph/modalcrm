const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('--- RAIO-X PROFUNDO: CONTAGEM DE DEALS ---');

    // 1. O mesmo Range de Tempo da TV
    const now = new Date();
    const brazilOffset = 3 * 60 * 60 * 1000;
    const brazilTime = new Date(now.getTime() - brazilOffset);
    const queryDateString = brazilTime.toISOString().split('T')[0];

    const startDate = new Date(`${queryDateString}T00:00:00.000Z`);
    const endDate = new Date(`${queryDateString}T23:59:59.999Z`);

    console.log(`Buscando deals criados/modificados ou com cliente vinculado onde a abertura foi entre: ${startDate.toISOString()} e ${endDate.toISOString()}`);

    // 2. Buscar como o SQL faria: Todos os Deals cujos clientes abriram conta hoje
    const deals = await prisma.deal.findMany({
        where: {
            client: {
                account_opening_date: {
                    gte: startDate,
                    lte: endDate,
                },
                tabulacao: 'Conta aberta',
            }
        },
        include: {
            client: {
                select: { name: true, integration_status: true, tabulacao: true, created_by: { select: { name: true } } }
            },
            responsible: { select: { name: true, surname: true } }
        }
    });

    console.log(`\n=> Encontrados TOTAL de ${deals.length} NEGÓCIOS (Deals) atrelados a clientes que abriram conta hoje e tem 'Conta aberta'.`);

    let integrationFail = 0;
    let integrationSuccess = 0;

    deals.forEach(d => {
        const respName = d.responsible ? `${d.responsible.name} ${d.responsible.surname || ''}`.trim() : 'Sem Responsável';
        if (d.client.integration_status === 'Cadastro salvo com sucesso!') {
            integrationSuccess++;
            console.log(`[VALIDO] Resp: ${respName} | Cliente: ${d.client.name}`);
        } else {
            integrationFail++;
            console.log(`[DESCARTE - STATUS] Resp: ${respName} | Cliente: ${d.client.name} | Status Real: ${d.client.integration_status}`);
        }
    });

    console.log(`\nResumo Deals: ${integrationSuccess} passaram no filtro da TV | ${integrationFail} descartados pelo integration_status.`);

}

run().catch(console.error).finally(() => prisma.$disconnect());
