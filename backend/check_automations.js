
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const automations = await prisma.automation.findMany({
            where: {
                is_active: true
            }
        });

        console.log("Total Automations:", automations.length);

        automations.forEach(auto => {
            const actions = auto.actions; // Json type
            if (Array.isArray(actions)) {
                actions.forEach(action => {
                    if (action.type === 'UPDATE_CLIENT') {
                        if (action.field === 'integration_status') {
                            console.log(`Automation ID: ${auto.id}`);
                            console.log(`Name: ${auto.name}`);
                            console.log(`Trigger: ${auto.trigger}`);
                            console.log(`Value Set: ${action.value}`);
                            console.log('---');
                        }
                    }
                });
            }
        });

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
