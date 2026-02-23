import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class TvDashboardService {
    constructor(private prisma: PrismaService) { }

    async getOpenAccountsMetrics(queryDate?: string) {
        // 1. Determine Date Range (Brazil Operational Window)
        // We need to cover:
        // A) Manual Dates (stored as 00:00 UTC) -> Start at 00:00 UTC
        // B) Timestamps late in Brazil night (e.g. 23:59 BRT = 02:59 UTC+1) -> End at 02:59 UTC+1

        const now = new Date();
        // Adjust to Brazil Time (UTC-3) to get "Today" string
        const brazilOffset = 3 * 60 * 60 * 1000;
        const brazilTime = new Date(now.getTime() - brazilOffset);
        let queryDateString = brazilTime.toISOString().split('T')[0];

        if (queryDate) {
            const parsed = new Date(queryDate);
            if (!isNaN(parsed.getTime())) {
                queryDateString = parsed.toISOString().split('T')[0];
            }
        }

        // Start: 00:00:00 UTC (Catches "Manual Date" entries 2026-02-02T00:00:00.000Z)
        const startDate = new Date(`${queryDateString}T00:00:00.000Z`);

        // End: 02:59:59 UTC Next Day (Catches late night sales up to 23:59 BRT)
        // Add 27 hours (24h day + 3h timezone compensation) minus 1ms
        const endDate = new Date(startDate.getTime() + (27 * 60 * 60 * 1000) - 1);

        console.log(`[TV DASHBOARD DEBUG] ServerTime: ${now.toISOString()} | QueryDate: ${queryDateString} | Window: ${startDate.toISOString()} - ${endDate.toISOString()}`);

        // 2. Query Database (Fetch clients to filter by Qualification in memory)
        // We switch from groupBy to findMany to ensure we check the LATEST qualification
        const clients = await this.prisma.client.findMany({
            where: {
                account_opening_date: {
                    gte: startDate,
                    lte: endDate,
                },
            },
            select: {
                id: true,
                created_by_id: true,
                tabulacao: true, // [FIX] Added missing field
                created_by: {
                    select: { id: true, name: true, surname: true }
                }
            }
        });

        // 3. Filter & Aggregate (In-Memory)
        // Criteria: Tabulation MUST be "Conta aberta" (Exact match based on user request)
        // [SIMPLIFICATION] Use direct client field
        const validClients = clients.filter(client => {
            return client.tabulacao === 'Conta aberta';
        });

        const aggregation = new Map<string, { user_name: string; count: number }>();
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

        // 4. Assemble Ranking
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
        let startDate = new Date(now.setHours(0, 0, 0, 0));
        let endDate = new Date(now.setHours(23, 59, 59, 999));

        if (queryDate) {
            const parsedDate = new Date(queryDate);
            if (!isNaN(parsedDate.getTime())) {
                startDate = new Date(parsedDate.setHours(0, 0, 0, 0));
                endDate = new Date(parsedDate.setHours(23, 59, 59, 999));
            }
        }

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

        // B) Qualifications (Proxy: is_qualified = true AND updated_at = today)
        // Ideally we would have a 'qualification_date', but using updated_at as proxy for now
        const totalQualifications = await this.prisma.client.count({
            where: {
                is_qualified: true,
                updated_at: {
                    gte: startDate,
                    lte: endDate,
                }
            }
        });

        // 4. Calculate User Ranking (Same as V1)
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
            total_qualifications: totalQualifications,
            conversion_rate: conversionRate,
            ranking,
            updated_at: new Date().toISOString(),
        };
    }
}
