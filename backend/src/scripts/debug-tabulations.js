
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
    try {
        const tabs = await prisma.tabulation.findMany();

        console.log("--- TABULATIONS ---");
        if (tabs.length === 0) {
            console.log("No tabulations found in the database.");
        } else {
            tabs.forEach(t => {
                console.log(`ID: ${t.id} | Label: "${t.label}" | Target Stage: ${t.target_stage_id} | Active: ${t.is_active}`);
            });
        }
    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
