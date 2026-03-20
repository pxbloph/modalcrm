import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface TeamSummary {
    key: 'fenix' | 'titas' | 'nao_mapeado';
    name: string;
    leadership: string;
    total_open_accounts: number;
    share_percent: number;
}

@Injectable()
export class TvDashboardService {
    private readonly teamMeta = {
        fenix: { name: 'Equipe F\u00eanix', leadership: 'Luana' },
        titas: { name: 'Equipe Tit\u00e3s', leadership: 'Henrique' },
    } as const;

    // Cache em memória: chave = "date|userId|allTeams", valor = { data, expiresAt }
    private readonly cache = new Map<string, { data: any; expiresAt: number }>();
    private readonly CACHE_TTL_MS = 55_000; // 55 segundos

    constructor(private prisma: PrismaService) {
        // Limpeza proativa do cache a cada 2 minutos
        setInterval(() => {
            const now = Date.now();
            for (const [key, entry] of this.cache.entries()) {
                if (now > entry.expiresAt) this.cache.delete(key);
            }
        }, 120_000);
    }

    private getCached(key: string) {
        const entry = this.cache.get(key);
        if (!entry) return null;
        if (Date.now() > entry.expiresAt) { this.cache.delete(key); return null; }
        return entry.data;
    }

    private setCached(key: string, data: any) {
        this.cache.set(key, { data, expiresAt: Date.now() + this.CACHE_TTL_MS });
    }

    private resolveDateRange(queryDate?: string) {
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

        return { startDate, endDate };
    }

    private buildResponsibleFilter(currentUser?: { id: string; role: string }, allTeams = false) {
        const base: any = {
            is_active: true,
            role: { not: 'ADMIN' },
        };

        if (currentUser?.role === 'SUPERVISOR' && !allTeams) {
            base.supervisor_id = currentUser.id;
        }

        return base;
    }

    private buildTeamSummary(responsibleCountsByTeam: Map<string, number>, totalOpenAccounts: number): TeamSummary[] {
        const teamTotals = new Map<TeamSummary['key'], TeamSummary>([
            ['fenix', { key: 'fenix', name: 'Equipe F\u00eanix', leadership: 'Luana', total_open_accounts: 0, share_percent: 0 }],
            ['titas', { key: 'titas', name: 'Equipe Tit\u00e3s', leadership: 'Henrique', total_open_accounts: 0, share_percent: 0 }],
            ['nao_mapeado', { key: 'nao_mapeado', name: 'N\u00e3o mapeado', leadership: 'Sem lideran\u00e7a definida', total_open_accounts: 0, share_percent: 0 }],
        ]);

        for (const [teamKey, count] of responsibleCountsByTeam.entries()) {
            const key = (teamKey === 'fenix' || teamKey === 'titas') ? teamKey : 'nao_mapeado';
            const currentTeam = teamTotals.get(key)!;
            currentTeam.total_open_accounts += count;
        }

        return Array.from(teamTotals.values()).map((team) => ({
            ...team,
            share_percent: totalOpenAccounts > 0
                ? Number(((team.total_open_accounts / totalOpenAccounts) * 100).toFixed(1))
                : 0,
        }));
    }

    async getOpenAccountsMetrics(queryDate?: string, currentUser?: { id: string; role: string }, allTeams = false) {
        const cacheKey = `open:${queryDate ?? 'today'}:${currentUser?.id ?? 'anon'}:${allTeams}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const { startDate, endDate } = this.resolveDateRange(queryDate);
        const responsibleFilter = this.buildResponsibleFilter(currentUser, allTeams);

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
                responsible: responsibleFilter,
            },
            select: {
                responsible_id: true,
                responsible: {
                    select: { name: true, surname: true, team: true }
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

        const activeOperators = await this.prisma.user.findMany({
            where: {
                role: 'OPERATOR',
                is_active: true,
                ...(currentUser?.role === 'SUPERVISOR' && !allTeams ? { supervisor_id: currentUser.id } : {}),
            },
            select: { id: true, name: true, surname: true, team: true }
        });

        const aggregation = new Map<string, { user_name: string; team: string | null; count: number; clients: any[] }>();
        const responsibleCountsByTeam = new Map<string, number>();
        let totalOpenAccounts = 0;

        const forbiddenNames = ['Administrador', 'Pablo Araujo', 'Renan Telles', 'Jennifer Vidal'];

        for (const op of activeOperators) {
            const fullName = `${op.name} ${op.surname || ''}`.trim();
            if (!forbiddenNames.includes(fullName)) {
                aggregation.set(op.id, {
                    user_name: fullName,
                    team: (op as any).team || null,
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
                    team: (deal.responsible as any).team || null,
                    count: 0,
                    clients: []
                });
            }

            const agg = aggregation.get(deal.responsible_id)!;
            agg.count++;
            const teamKey = (deal.responsible as any).team || 'nao_mapeado';
            responsibleCountsByTeam.set(teamKey, (responsibleCountsByTeam.get(teamKey) || 0) + 1);

            if (deal.client && agg.clients.length < 50) {
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

        const ranking = Array.from(aggregation.entries())
            .map(([userId, data]) => ({
                user_id: userId,
                user_name: data.user_name,
                team: data.team,
                count: data.count,
                clients: data.clients
            }))
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return a.user_name.localeCompare(b.user_name);
            });

        const team_summary = this.buildTeamSummary(responsibleCountsByTeam, totalOpenAccounts);

        const result = {
            date: startDate.toISOString().split('T')[0],
            total_open_accounts: totalOpenAccounts,
            ranking,
            team_summary,
            updated_at: new Date().toISOString(),
        };
        this.setCached(cacheKey, result);
        return result;
    }

    async getExpandedMetrics(queryDate?: string, currentUser?: { id: string; role: string }, allTeams = false) {
        const cacheKey = `expanded:${queryDate ?? 'today'}:${currentUser?.id ?? 'anon'}:${allTeams}`;
        const cached = this.getCached(cacheKey);
        if (cached) return cached;

        const { startDate, endDate } = this.resolveDateRange(queryDate);
        const responsibleFilter = this.buildResponsibleFilter(currentUser, allTeams);

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
                responsible: responsibleFilter,
            },
            _count: { id: true },
        });

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
            if (userMap.has(grouped.responsible_id)) {
                totalOpenAccounts += grouped._count.id;
                responsibleCounts.set(grouped.responsible_id, grouped._count.id);
            }
        }

        const totalLeadsCreated = await this.prisma.client.count({
            where: {
                created_at: {
                    gte: startDate,
                    lte: endDate,
                }
            }
        });

        const totalQualifiedClients = await this.prisma.client.count({
            where: {
                is_qualified: true,
                updated_at: {
                    gte: startDate,
                    lte: endDate,
                }
            }
        });

        const ranking = Array.from(responsibleCounts.entries())
            .map(([userId, count]) => {
                return {
                    user_id: userId,
                    user_name: userMap.get(userId) || 'Desconhecido',
                    count,
                };
            })
            .sort((a, b) => {
                if (b.count !== a.count) return b.count - a.count;
                return a.user_name.localeCompare(b.user_name);
            });

        const conversionRate = totalLeadsCreated > 0
            ? ((totalOpenAccounts / totalLeadsCreated) * 100).toFixed(1)
            : '0.0';

        const result = {
            date: startDate.toISOString().split('T')[0],
            total_open_accounts: totalOpenAccounts,
            total_leads_created: totalLeadsCreated,
            total_clients: totalQualifiedClients,
            conversion_rate: conversionRate,
            ranking,
            updated_at: new Date().toISOString(),
        };
        this.setCached(cacheKey, result);
        return result;
    }
}
