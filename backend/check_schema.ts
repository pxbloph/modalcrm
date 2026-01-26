
import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkSchema() {
    try {
        console.log('Checking Schema compatibility...');

        // Try to access a new table introduced in the migration
        const count = await prisma.automation.count();
        console.log(`✅ Schema is UP TO DATE. Automations table exists (Count: ${count}).`);

    } catch (e: any) {
        if (e.code === 'P2021') { // Table not found
            console.log('❌ Schema MISMATCH. The table "automations" does not exist.');
            console.log('You need to re-apply the migration SQL.');
        } else {
            console.error('Error checking schema:', e);
        }
    } finally {
        await prisma.$disconnect();
    }
}

checkSchema();
