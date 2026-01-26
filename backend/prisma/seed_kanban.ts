import { PrismaClient, FieldType } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
    console.log('Seeding Kanban Data...');

    // 1. Create Default Pipeline
    const pipeline = await prisma.pipeline.create({
        data: {
            name: 'Fluxo de Qualificação',
            is_default: true,
            stages: {
                create: [
                    { name: 'Novos Leads', order_index: 0, color: '#3b82f6' }, // Blue
                    { name: 'Em Contato', order_index: 1, color: '#f59e0b' }, // Amber
                    { name: 'Qualificado', order_index: 2, color: '#10b981' }, // Emerald
                    { name: 'Interessado', order_index: 3, color: '#8b5cf6' }, // Violet
                    { name: 'Sem Resposta', order_index: 4, color: '#6b7280' }, // Gray
                    { name: 'Desqualificado', order_index: 5, color: '#ef4444' }, // Red
                ],
            },
        },
        include: { stages: true },
    });

    console.log(`Created Pipeline: ${pipeline.name} with ${pipeline.stages.length} stages.`);

    // 2. Create some Custom Fields
    await prisma.customField.createMany({
        data: [
            {
                pipeline_id: pipeline.id,
                key: 'valor_estimado',
                label: 'Valor Estimado',
                type: FieldType.NUMBER,
                is_visible: true,
            },
            {
                pipeline_id: pipeline.id,
                key: 'origem_lead',
                label: 'Origem do Lead',
                type: FieldType.SELECT,
                options: { options: ['Instagram', 'Google', 'Indicação', 'Bitrix'] }, // Correct JSON format
                is_visible: true,
            },
            {
                pipeline_id: pipeline.id,
                key: 'data_ultimo_contato',
                label: 'Último Contato',
                type: FieldType.DATE,
                is_visible: true,
            },
        ],
    });

    console.log('Created Custom Fields.');
}

main()
    .catch((e) => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
