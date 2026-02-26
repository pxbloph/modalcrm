import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient, Prisma } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {

    constructor() {
        super();
        // Middleware para interceptar criações/atualizações e subtrair 3 horas das datas 
        // para que o Prisma (que envia sempre como UTC absoluto) faça o banco armazenar
        // com a "cara" da hora do Brasil.
        this.$use(async (params, next) => {
            if (['create', 'update', 'createMany', 'updateMany', 'upsert'].includes(params.action)) {
                this.shiftDatesRecursively(params.args);
            }
            const result = await next(params);

            // Opcional: Deslocar de volta a leitura (Se o banco devolver o número "cru", 
            // no JS pode ficar 3 horas diferente do esperado se não voltarmos).
            // Apenas leitura (find)
            if (['findUnique', 'findFirst', 'findMany'].includes(params.action) && result) {
                this.shiftDatesRecursivelyRead(result);
            }

            return result;
        });
    }

    async onModuleInit() {
        await this.$connect();
        // Opcionalmente forçar a timezone transacionalmente neste pool, 
        // mas o Prisma client não mantém sessões vivas fixas a menos que via transaction.
    }

    async onModuleDestroy() {
        await this.$disconnect();
    }

    // Função para descer a hora antes de enviar pro banco
    private shiftDatesRecursively(obj: any) {
        if (!obj || typeof obj !== 'object') return;

        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (value instanceof Date) {
                // Diminui 3 horas. Quando o Prisma converter para string UTC, ele vai mandar 
                // para o Postgres algo como '23:00' (que era o real do Brasil) em vez de '02:00'.
                obj[key] = new Date(value.getTime() - (3 * 60 * 60 * 1000));
            } else if (typeof value === 'object') {
                this.shiftDatesRecursively(value);
            }
        }
    }

    // Função para subir a hora quando o banco cruzar os dados de volta
    private shiftDatesRecursivelyRead(obj: any) {
        if (!obj || typeof obj !== 'object') return;

        for (const key of Object.keys(obj)) {
            const value = obj[key];
            if (value instanceof Date) {
                // Na leitura, ele vai voltar reduzido em 3h, então repomos pra o JS ficar feliz.
                obj[key] = new Date(value.getTime() + (3 * 60 * 60 * 1000));
            } else if (typeof value === 'object') {
                this.shiftDatesRecursivelyRead(value);
            }
        }
    }
}
