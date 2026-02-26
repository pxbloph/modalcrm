const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('--- INICIANDO AUDITORIA DO DASHBOARD TV ---');

    // 1. Definir o range de datas exatamente como a TV faz (Horário de Brasília)
    const now = new Date();
    const brazilOffset = 3 * 60 * 60 * 1000;
    const brazilTime = new Date(now.getTime() - brazilOffset);
    const queryDateString = brazilTime.toISOString().split('T')[0];

    const startDate = new Date(`${queryDateString}T00:00:00.000Z`);
    const endDate = new Date(`${queryDateString}T23:59:59.999Z`);

    console.log(`Buscando dados entre: ${startDate.toISOString()} e ${endDate.toISOString()} (Representando 00:00h as 23:59h BRT)`);

    // 2. Buscar TODOS os leads que tiveram a conta aberta HOJE (Independente do Status)
    const allOpenedToday = await prisma.client.findMany({
        where: {
            account_opening_date: {
                gte: startDate,
                lte: endDate,
            }
        },
        select: {
            id: true,
            name: true,
            tabulacao: true,
            integration_status: true,
            created_by: { select: { name: true, surname: true } },
            deals: {
                orderBy: { created_at: 'desc' }, take: 1,
                select: { responsible_id: true, responsible: { select: { name: true, surname: true } } }
            }
        }
    });

    console.log(`\n=> Encontrados TOTAL de ${allOpenedToday.length} clientes com account_opening_date de HOJE no banco.`);

    // 3. Destrinchar os motivos pelos quais eles podem NÃO estar pontuando
    let tabulacaoIncorreta = 0;
    let integrationStatusIncorreto = 0;
    let validosParaTV = [];

    allOpenedToday.forEach(client => {
        let isValid = true;

        if (client.tabulacao !== 'Conta aberta') {
            tabulacaoIncorreta++;
            isValid = false;
        }

        if (client.integration_status !== 'Cadastro salvo com sucesso!') {
            integrationStatusIncorreto++;
            isValid = false;
        }

        if (isValid) {
            const responsibleName = client.deals[0]?.responsible ? `${client.deals[0].responsible.name} ${client.deals[0].responsible.surname}` : 'Desconhecido';
            validosParaTV.push({
                clientName: client.name,
                responsible: responsibleName
            });
        }
    });

    console.log(`- Desses, ${tabulacaoIncorreta} falharam por não ter a tabulacao exata "Conta aberta".`);
    console.log(`- Desses, ${integrationStatusIncorreto} falharam por não ter o integration_status exato "Cadastro salvo com sucesso!".`);
    console.log(`- Restaram ${validosParaTV.length} clientes VÁLIDOS que efetivamente pontuam na TV hoje.\n`);

    // 4. Agrupar os validos
    const ranking = {};
    validosParaTV.forEach(v => {
        ranking[v.responsible] = (ranking[v.responsible] || 0) + 1;
    });

    console.log('--- RANKING REAL CALCULADO ---');
    Object.entries(ranking).sort((a, b) => b[1] - a[1]).forEach(([nome, count]) => {
        console.log(`${nome}: ${count}`);
    });

}

run().catch(console.error).finally(() => prisma.$disconnect());
