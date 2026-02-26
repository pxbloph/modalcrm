function buildWhere(pipelineId, responsibleId, clientId, search, tabulation, startDate, endDate, openAccountStartDate, openAccountEndDate) {
    const where = { AND: [] };

    if (pipelineId) where.AND.push({ pipeline_id: pipelineId });
    if (responsibleId) {
        where.AND.push({
            responsible_id: responsibleId === 'unassigned' ? null : responsibleId
        });
    }
    if (clientId) where.AND.push({ client_id: clientId });

    if (tabulation) {
        where.AND.push({
            client: {
                tabulacao: { contains: tabulation, mode: 'insensitive' }
            }
        });
    }

    if (startDate || endDate) {
        const dateFilter = {};
        if (startDate) {
            dateFilter.gte = startDate.length <= 10 ? new Date(`${startDate}T00:00:00.000Z`) : new Date(startDate);
        }
        if (endDate) {
            if (endDate.length <= 10) {
                dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
            } else {
                dateFilter.lte = new Date(endDate);
            }
        }
        where.AND.push({ created_at: dateFilter });
    }

    if (openAccountStartDate || openAccountEndDate) {
        const dateFilter = {};
        if (openAccountStartDate) {
            dateFilter.gte = openAccountStartDate.length <= 10 ? new Date(`${openAccountStartDate}T00:00:00.000Z`) : new Date(openAccountStartDate);
        }
        if (openAccountEndDate) {
            if (openAccountEndDate.length <= 10) {
                dateFilter.lte = new Date(`${openAccountEndDate}T23:59:59.999Z`);
            } else {
                dateFilter.lte = new Date(openAccountEndDate);
            }
        }
        where.AND.push({ client: { account_opening_date: dateFilter } });
    }

    if (search) {
        where.AND.push({
            OR: [
                { title: { contains: search, mode: 'insensitive' } },
                { client: { name: { contains: search, mode: 'insensitive' } } },
                { client: { surname: { contains: search, mode: 'insensitive' } } },
                { client: { cnpj: { contains: search, mode: 'insensitive' } } },
                { client: { email: { contains: search, mode: 'insensitive' } } },
                { client: { phone: { contains: search, mode: 'insensitive' } } },
            ]
        });
    }

    if (where.AND.length === 0) return {};
    return where;
}

const params = {
    pipelineId: "some_pip",
    responsibleId: "priscila_uuid",
    search: "Abertura",
    tabulation: "Conta aberta",
    startDate: undefined,
    endDate: undefined,
    openAccountStartDate: "2026-02-01",
    openAccountEndDate: "2026-02-23"
};

const result = buildWhere(
    params.pipelineId, params.responsibleId, undefined, params.search,
    params.tabulation, params.startDate, params.endDate,
    params.openAccountStartDate, params.openAccountEndDate
);

console.log(JSON.stringify(result, null, 2));

const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    const users = await prisma.user.findMany({
        where: { name: { contains: 'Priscila' } }
    });

    const priscila = users[0];

    // Check if the query works
    const dbParams = { ...params, responsibleId: priscila.id };

    const dbResult = buildWhere(
        undefined, dbParams.responsibleId, undefined, dbParams.search,
        dbParams.tabulation, dbParams.startDate, dbParams.endDate,
        dbParams.openAccountStartDate, dbParams.openAccountEndDate
    );

    const deals = await prisma.deal.findMany({
        where: dbResult,
        include: { responsible: true, client: true }
    });

    console.log(`\nPrisma returned ${deals.length} deals.`);
    deals.forEach(d => console.log(d.id, d.title, d.responsible?.name));
}

run().catch(console.error).finally(() => prisma.$disconnect());
