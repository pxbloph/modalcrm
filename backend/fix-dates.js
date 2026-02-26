const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    console.log('--- CORRIGINDO DATAS ERRADAS DO DIA 25/02 PARA 26/02 ---');

    // As datas problemáticas da TV do User eram aquelas que deveriam ser 26/02, mas 
    // caíram como 25/02 21:00:00.000 (O UTC de 26/02 meia-noite)

    const affectedClients = await prisma.client.findMany({
        where: {
            account_opening_date: new Date('2026-02-25T21:00:00.000Z')
        }
    });

    console.log(`Encontrados ${affectedClients.length} leads com o BUG do relógio escorregado (21h do dia anterior). Movendo pra 12:00h do dia 26/02.`);

    let updated = 0;
    for (const c of affectedClients) {
        await prisma.client.update({
            where: { id: c.id },
            data: { account_opening_date: new Date('2026-02-26T12:00:00.000-03:00') }
        });
        updated++;
    }

    console.log(`SUCESSO! ${updated} datas consertadas.`);

}

run().catch(console.error).finally(() => prisma.$disconnect());
