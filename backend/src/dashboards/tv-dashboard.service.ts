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

        // 2. Fetch Active Users (Operators, Leaders, Supervisors, Admins)
        const activeOperators = await this.prisma.user.findMany({
            where: {
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

        // 3. Query Database: Fetch Deals directly
        const validDeals = await this.prisma.deal.findMany({
            where: {
                client: {
                    account_opening_date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    tabulacao: 'Conta aberta', // [FIX] Parity with V1 and Kanban
                    integration_status: 'Cadastro salvo com sucesso!',
                }
            },
            select: {
                responsible_id: true,
                responsible: {
                    select: { name: true, surname: true }
                }
            }
        });

        // 4. Aggregate Points by Responsible User
        let totalOpenAccounts = 0;

        for (const deal of validDeals) {
            if (!deal.responsible_id) continue;

            totalOpenAccounts++;

            if (!aggregation.has(deal.responsible_id)) {
                const userName = deal.responsible
                    ? `${deal.responsible.name} ${deal.responsible.surname || ''}`.trim()
                    : 'Desconhecido';

                aggregation.set(deal.responsible_id, {
                    user_name: userName,
                    count: 0
                });
            }

            aggregation.get(deal.responsible_id)!.count++;
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

        // 2. Fetch Base Metrics (Open Accounts based on DEALS)
        const openDealsGrouped = await this.prisma.deal.groupBy({
            by: ['responsible_id'],
            where: {
                client: {
                    account_opening_date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    tabulacao: 'Conta aberta', // [FIX] Parity with V1 and Kanban
                    integration_status: 'Cadastro salvo com sucesso!',
                }
            },
            _count: { id: true },
        });

        let totalOpenAccounts = 0;
        const responsibleCounts = new Map<string, number>();

        for (const grouped of openDealsGrouped) {
            if (!grouped.responsible_id) continue;
            totalOpenAccounts += grouped._count.id;
            responsibleCounts.set(grouped.responsible_id, grouped._count.id);
        }

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
        const userIds = Array.from(responsibleCounts.keys());
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, surname: true },
        });
        const userMap = new Map(users.map((u) => [u.id, `${u.name} ${u.surname || ''}`.trim()]));

        const ranking = Array.from(responsibleCounts.entries())
            .map(([userId, count]) => {
                return {
                    user_id: userId,
                    user_name: userMap.get(userId) || 'Desconhecido',
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
