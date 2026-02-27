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

        // 2. Fetch Deals directly for Open Accounts metrics
        const validDeals = await this.prisma.deal.findMany({
            where: {
                client: {
                    account_opening_date: {
                        gte: startDate,
                        lte: endDate,
                    },
                    tabulacao: 'Conta aberta',
                    integration_status: 'Cadastro salvo com sucesso!',
                },
                responsible: {
                    is_active: true, // Apenas usuários ativos
                    role: { not: 'ADMIN' } // Perfis administrativos não apareçam
                }
            },
            select: {
                responsible_id: true,
                responsible: {
                    select: { name: true, surname: true }
                },
                client: {
                    select: {
                        id: true,
                        name: true,
                        cnpj: true,
                        phone: true,
                        account_opening_date: true,
                        created_by: {
                            select: { name: true, surname: true }
                        }
                    }
                }
            }
        });

        // Fetch all active operators to show zeros
        const activeOperators = await this.prisma.user.findMany({
            where: {
                role: 'OPERATOR',
                is_active: true,
            },
            select: { id: true, name: true, surname: true }
        });

        // 3. Aggregate Points by Responsible User
        const aggregation = new Map<string, { user_name: string; count: number; clients: any[] }>();
        let totalOpenAccounts = 0;

        const forbiddenNames = ['Administrador', 'Pablo Araujo', 'Renan Telles', 'Jennifer Vidal'];

        for (const op of activeOperators) {
            const fullName = `${op.name} ${op.surname || ''}`.trim();
            if (!forbiddenNames.includes(fullName)) {
                aggregation.set(op.id, {
                    user_name: fullName,
                    count: 0,
                    clients: []
                });
            }
        }

        for (const deal of validDeals) {
            if (!deal.responsible_id || !deal.responsible) continue;

            const fullName = `${deal.responsible.name} ${deal.responsible.surname || ''}`.trim();

            if (forbiddenNames.includes(fullName)) {
                continue;
            }

            totalOpenAccounts++;

            if (!aggregation.has(deal.responsible_id)) {
                aggregation.set(deal.responsible_id, {
                    user_name: fullName,
                    count: 0,
                    clients: []
                });
            }

            const agg = aggregation.get(deal.responsible_id)!;
            agg.count++;

            if (deal.client) {
                agg.clients.push({
                    id: deal.client.id,
                    name: deal.client.name,
                    cnpj: deal.client.cnpj,
                    phone: deal.client.phone,
                    account_opening_date: deal.client.account_opening_date,
                    created_by_name: deal.client.created_by ? `${deal.client.created_by.name} ${deal.client.created_by.surname || ''}`.trim() : 'Desconhecido',
                    responsible_name: fullName
                });
            }
        }

        // 4. Assemble Ranking
        const ranking = Array.from(aggregation.entries())
            .map(([userId, data]) => ({
                user_id: userId,
                user_name: data.user_name,
                count: data.count,
                clients: data.clients
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
                    tabulacao: 'Conta aberta',
                    integration_status: 'Cadastro salvo com sucesso!',
                },
                responsible: {
                    is_active: true,
                    role: { not: 'ADMIN' },
                }
            },
            _count: { id: true },
        });

        // 3. Fetch user names and filter specific profiles
        const userIds = openDealsGrouped.map(g => g.responsible_id).filter(Boolean) as string[];

        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true, surname: true },
        });

        const forbiddenNames = ['Administrador', 'Pablo Araujo', 'Renan Telles', 'Jennifer Vidal'];
        const userMap = new Map<string, string>();

        users.forEach(u => {
            const fullName = `${u.name} ${u.surname || ''}`.trim();
            if (!forbiddenNames.includes(fullName)) {
                userMap.set(u.id, fullName);
            }
        });

        let totalOpenAccounts = 0;
        const responsibleCounts = new Map<string, number>();

        for (const grouped of openDealsGrouped) {
            if (!grouped.responsible_id) continue;
            // Only count if user was not filtered out
            if (userMap.has(grouped.responsible_id)) {
                totalOpenAccounts += grouped._count.id;
                responsibleCounts.set(grouped.responsible_id, grouped._count.id);
            }
        }

        // 4. Fetch New Metrics
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

        // 5. Calcular Ranking de Usuários
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

        // 6. Calculate Conversion Rate
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
