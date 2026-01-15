"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const client_1 = require("@prisma/client");
async function main() {
    const prisma = new client_1.PrismaClient();
    console.log('Checking if formTemplate exists...');
    if (prisma.formTemplate) {
        console.log('SUCCESS: prisma.formTemplate exists!');
    }
    else {
        console.log('ERROR: prisma.formTemplate is undefined!');
        console.log('Available models:', Object.keys(prisma).filter(k => !k.startsWith('_') && !k.startsWith('$')));
    }
    await prisma.$disconnect();
}
main();
//# sourceMappingURL=test-prisma-client.js.map