
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function run() {
    try {
        const cnpj = '207821330001174';
        const cleanCnpj = cnpj.replace(/\D/g, '');

        // 1. Find User Karina
        const karina = await prisma.user.findFirst({
            where: {
                name: { contains: 'Karina', mode: 'insensitive' }
            }
        });
        console.log("User Karina:", karina ? `${karina.name} (ID: ${karina.id})` : "Not Found");

        // 2. Find Client/Deal
        const client = await prisma.client.findFirst({
            where: {
                OR: [{ cnpj: cnpj }, { cnpj: cleanCnpj }]
            },
            include: {
                created_by: true,
                deals: {
                    include: {
                        responsible: true
                    }
                }
            }
        });

        if (!client) {
            console.log("Client not found.");
        } else {
            console.log("Client ID:", client.id);
            console.log("Client Owner (created_by):", client.created_by.name, `(${client.created_by_id})`);

            if (client.deals.length > 0) {
                console.log("Deals found:", client.deals.length);
                client.deals.forEach(d => {
                    console.log(`- Deal ID: ${d.id}`);
                    console.log(`  Title: ${d.title}`);
                    console.log(`  Responsible ID: ${d.responsible_id}`);
                    console.log(`  Responsible Name: ${d.responsible?.name || 'N/A'}`);
                });
            } else {
                console.log("No deals found for this client.");
            }
        }

    } catch (e) {
        console.error(e);
    } finally {
        await prisma.$disconnect();
    }
}

run();
