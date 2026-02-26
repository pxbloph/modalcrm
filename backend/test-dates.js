const { PrismaClient } = require('@prisma/client');
const { TvDashboardService } = require('./dist/dashboards/tv-dashboard.service');

const prisma = new PrismaClient(); // No logs

async function run() {
    const svc = new TvDashboardService(prisma);

    console.log("=== GET OPEN ACCOUNTS (V1) ===");
    const v1 = await svc.getOpenAccountsMetrics();
    console.log("Total V1:", v1.total_open_accounts);
    console.log("Top 3:", v1.ranking.slice(0, 3));

    console.log("=== GET EXPANDED METRICS (V2) ===");
    const v2 = await svc.getExpandedMetrics();
    console.log("Total V2:", v2.total_open_accounts);
    console.log("Top 3:", v2.ranking.slice(0, 3));
}

run().catch(console.error).finally(() => prisma.$disconnect());
