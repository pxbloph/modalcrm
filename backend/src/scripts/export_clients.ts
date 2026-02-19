
import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';
import * as path from 'path';

const prisma = new PrismaClient();

async function main() {
  console.log('Iniciando exportação...');

  const startDate = new Date('2026-02-02T00:00:00.000Z');
  const endDate = new Date('2026-02-06T23:59:59.999Z');
  const targetTabulation = 'AGUARDANDO ABERTURA';

  const clients = await prisma.client.findMany({
    where: {
      created_at: {
        gte: startDate,
        lte: endDate,
      },
      qualifications: {
        some: {
          tabulacao: targetTabulation,
        },
      },
    },
    select: {
      name: true,
      cnpj: true,
      email: true,
      phone: true,
      created_at: true,
    },
    orderBy: {
      created_at: 'desc',
    },
  });

  console.log(`Encontrados ${clients.length} clientes.`);

  const header = ['Razão Social', 'CNPJ', 'Email', 'Telefone', 'Data Cadastro'].join(';') + '\n';
  const rows = clients.map(c => {
    return [
      c.name,
      c.cnpj,
      c.email,
      c.phone,
      c.created_at.toLocaleString('pt-BR'),
    ].join(';');
  }).join('\n');

  const csvContent = header + rows;
  const outputPath = path.resolve(__dirname, '../../clientes_aguardando.csv');

  fs.writeFileSync(outputPath, csvContent, 'utf-8');
  console.log(`Arquivo salvo em: ${outputPath}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
