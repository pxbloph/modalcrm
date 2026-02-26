const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function main() {
  const users = await prisma.user.findMany({
    where: { OR: [{ name: { contains: 'Priscila' } }, { name: { contains: 'Elza' } }] }
  });
  console.log('Users found:');
  users.forEach(u => console.log(u.id, u.name));

  const priscila = users.find(u => u.name.includes('Priscila'));
  if (priscila) {
    console.log(`\nDeals for Priscila (${priscila.id}) searching for "Abertura":`);
    const whereClause = {
      AND: [
        { responsible_id: priscila.id },
        {
          OR: [
            { title: { contains: 'Abertura', mode: 'insensitive' } },
            { client: { name: { contains: 'Abertura', mode: 'insensitive' } } },
            { client: { surname: { contains: 'Abertura', mode: 'insensitive' } } },
            { client: { cnpj: { contains: 'Abertura', mode: 'insensitive' } } },
            { client: { email: { contains: 'Abertura', mode: 'insensitive' } } },
            { client: { phone: { contains: 'Abertura', mode: 'insensitive' } } },
          ]
        }
      ]
    };
    
    // Testing the same where clause pattern Handles
    const deals = await prisma.deal.findMany({
      where: whereClause,
      include: {
        responsible: true,
        client: true
      }
    });

    console.log(`Found ${deals.length} deals.`);
    deals.slice(0, 5).forEach(d => {
      console.log(`Deal ID: ${d.id} | Title: ${d.title} | Resp: ${d.responsible?.name} | Client: ${d.client?.name}`);
    });

    // Let's also test what happens without the Search filter
    console.log(`\nDeals for Priscila WITHOUT Search filter:`);
    const whereClauseNoSearch = {
      AND: [
        { responsible_id: priscila.id }
      ]
    };
    const dealsNoSearch = await prisma.deal.findMany({
      where: whereClauseNoSearch,
      include: { responsible: true }
    });
    console.log(`Found ${dealsNoSearch.length} deals without search.`);
    
    // Let's test the AND simplification to see if it makes a difference inside an OR.
    // In our DealService code:
  }
}

main().catch(console.error).finally(() => prisma.$disconnect());
