import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TvDashboardService {
    constructor(private prisma: PrismaService) { }

    async getOpenAccountsMetrics(queryDate?: string) {
        // 1. Determine Date Range (Brazil Operational Window)
        const now = new Date();
        const brazilOffset = 3 * 60 * 60 * 1000;
        const brazilTime = new Date(now.getTime() - brazilOffset);
        let queryDateString = brazilTime.toISOString().split('T')[0];

        if (queryDate) {
            const parsed = new Date(queryDate);
            if (!isNaN(parsed.getTime())) {
                queryDateString = parsed.toISOString().split('T')[0];
            }
        }

        const startDate = new Date(`${queryDateString}T00:00:00.000Z`);
        const endDate = new Date(`${queryDateString}T23:59:59.999Z`);

        // 2. Fetch Active Operators
        const activeOperators = await this.prisma.user.findMany({
            where: {
                role: 'OPERATOR',
                is_active: true,
            },
            select: { id: true, name: true, surname: true }
        });

        const aggregation = new Map<string, { user_name: string; count: number }>();

        // Initialize all active operators with 0 count
        for (const op of activeOperators) {
            aggregation.set(op.id, {
                user_name: `${op.name} ${op.surname || ''}`.trim(),
                count: 0
            });
        }

        // 3. Query Database (Fetch clients to filter by Qualification in memory)
        const clients = await this.prisma.client.findMany({
            where: {
                account_opening_date: {
                    gte: startDate,
                    lte: endDate,
                },
                integration_status: 'Cadastro salvo com sucesso!',
            },
            select: {
                id: true,
                created_by_id: true,
                tabulacao: true,
                created_by: {
                    select: { id: true, name: true, surname: true }
                }
            }
        });

        // 4. Filter & Aggregate (In-Memory)
        const validClients = clients.filter(client => {
            return client.tabulacao === 'Conta aberta';
        });

        let totalOpenAccounts = 0;

        for (const client of validClients) {
            if (!client.created_by_id) continue;

            totalOpenAccounts++;

            if (!aggregation.has(client.created_by_id)) {
                const userName = client.created_by
                    ? `${client.created_by.name} ${client.created_by.surname || ''}`.trim()
                    : 'Desconhecido';

                aggregation.set(client.created_by_id, {
                    user_name: userName,
                    count: 0
                });
            }

            aggregation.get(client.created_by_id)!.count++;
        }

        // 5. Assemble Ranking
        const ranking = Array.from(aggregation.entries())
            .map(([userId, data]) => ({
                user_id: userId,
                user_name: data.user_name,
                count: data.count
            }))
            .sort((a, b) => {
                // Sort by Count DESC, then Name ASC
                if (b.count !== a.count) return b.count - a.count;
                return a.user_name.localeCompare(b.user_name);
            });

        return {
            date: startDate.toISOString().split('T')[0],
            total_open_accounts: totalOpenAccounts,
            ranking,
            updated_at: new Date().toISOString(),
        };
    }
    async getExpandedMetrics(queryDate?: string) {
        // 1. Determine Date Range
        const now = new Date();
        const brazilOffset = 3 * 60 * 60 * 1000;
        const brazilTime = new Date(now.getTime() - brazilOffset);
        let queryDateString = brazilTime.toISOString().split('T')[0];

        if (queryDate) {
            const parsed = new Date(queryDate);
            if (!isNaN(parsed.getTime())) {
                queryDateString = parsed.toISOString().split('T')[0];
            }
        }

        const startDate = new Date(`${queryDateString}T00:00:00.000Z`);
        const endDate = new Date(`${queryDateString}T23:59:59.999Z`);

        // 2. Fetch Base Metrics (Open Accounts)
        // Reuse logic but we need the raw number
        const openAccountsGrouped = await this.prisma.client.groupBy({
            by: ['created_by_id'],
            where: {
                account_opening_date: {
                    gte: startDate,
                    lte: endDate,
                },
                tabulacao: 'Conta aberta', // [FIX] Parity with V1 and Kanban
                integration_status: 'Cadastro salvo com sucesso!',
            },
            _count: { id: true },
        });

        // 3. Fetch New Metrics
        // A) Total Leads Created Today
        const totalLeadsCreated = await this.prisma.client.count({
            where: {
                created_at: {
                    gte: startDate,
                    lte: endDate,
                }
            }
        });

        // B) Qualificações (Proxy: is_qualified = true AND updated_at = hoje)
        const totalQualifiedClients = await this.prisma.client.count({
            where: {
                is_qualified: true,
                updated_at: {
                    gte: startDate,
                    lte: endDate,
                }
            }
        });

        // 4. Calcular Ranking de Usuários
        const userIds = openAccountsGrouped.map((m) => m.created_by_id).filter((id) => id);
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, surname: true },
        });
        const userMap = new Map(users.map((u) => [u.id, `${u.name} ${u.surname || ''}`.trim()]));

        let totalOpenAccounts = 0;
        const ranking = openAccountsGrouped
            .map((item) => {
                const count = item._count.id;
                totalOpenAccounts += count;
                return {
                    user_id: item.created_by_id,
                    user_name: userMap.get(item.created_by_id) || 'Desconhecido',
                    count: count,
                };
            })
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return a.user_name.localeCompare(b.user_name);
            });

        // 5. Calculate Conversion Rate
        // (Open Accounts / Leads Created) * 100
        const conversionRate = totalLeadsCreated > 0
            ? ((totalOpenAccounts / totalLeadsCreated) * 100).toFixed(1)
            : '0.0';

        return {
            date: startDate.toISOString().split('T')[0],
            total_open_accounts: totalOpenAccounts,
            total_leads_created: totalLeadsCreated,
            total_clients: totalQualifiedClients,
            conversion_rate: conversionRate,
            ranking,
            updated_at: new Date().toISOString(),
        };
    }
}
