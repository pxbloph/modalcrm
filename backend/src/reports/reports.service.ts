import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { ReportFilterDto } from './dto/report-filter.dto';
import { User, Role } from '@prisma/client';

@Injectable()
export class ReportsService {
    constructor(private prisma: PrismaService) { }

    private buildWhereClause(filters: ReportFilterDto, currentUser: User): any {
        const where: any = {};

        // 1. Basic RBAC
        if (currentUser.role === Role.SUPERVISOR) {
            // Supervisor sees deals where responsible is in their team OR they are responsible
            // Broadest safe assumption for "Premium CRM": Admin/Supervisor sees all, Operator sees own.
            // If filters.operatorId passed, respect it.
        }
        if (currentUser.role === Role.OPERATOR) {
            where.responsible_id = currentUser.id;
        }

        // 2. Date Filters (Created At)
        if (filters.startDate || filters.endDate) {
            where.created_at = {};
            if (filters.startDate) where.created_at.gte = new Date(filters.startDate);
            if (filters.endDate) where.created_at.lte = new Date(filters.endDate);
        }

        // 3. Specific Filters
        if (filters.operatorId) where.responsible_id = filters.operatorId;
        if (filters.status) where.status = filters.status as any; // Cast to DealStatus enum
        if (filters.origin) {
            // If origin is a tag or field, this is complex. Ignoring for core Kanban report for now.
        }

        return where;
    }

    async getDashboardStats(filters: ReportFilterDto, currentUser: User) {
        const where = this.buildWhereClause(filters, currentUser);

        const [totalDeals, wonDeals, totalValue] = await Promise.all([
            this.prisma.deal.count({ where }),
            this.prisma.deal.count({ where: { ...where, status: 'WON' } }),
            this.prisma.deal.aggregate({
                where,
                _sum: { value: true }
            })
        ]);

        const conversionRate = totalDeals > 0 ? (wonDeals / totalDeals) * 100 : 0;

        return {
            total_leads: totalDeals,
            total_qualified: wonDeals, // Reusing terms from existing frontend or adapting
            total_value: totalValue._sum.value || 0,
            conversion_rate: conversionRate
        };
    }

    async getDealsByStage(filters: ReportFilterDto, currentUser: User) {
        const where = this.buildWhereClause(filters, currentUser);

        // Group by Stage ID
        const grouped = await this.prisma.deal.groupBy({
            by: ['stage_id'],
            where,
            _count: { id: true },
            _sum: { value: true }
        });

        // Fetch Stage Names
        const stages = await this.prisma.pipelineStage.findMany({
            select: { id: true, name: true, color: true, order_index: true }
        });

        // Map Results
        return stages.map(stage => {
            const data = grouped.find(g => g.stage_id === stage.id);
            return {
                stage_name: stage.name,
                stage_color: stage.color,
                count: data?._count.id || 0,
                value: data?._sum.value || 0,
                order: stage.order_index
            };
        }).sort((a, b) => a.order - b.order);
    }

    async getProductionStats(filters: ReportFilterDto, currentUser: User) {
        const where = this.buildWhereClause(filters, currentUser);

        // Group by Responsible
        // Prisma groupBy doesn't support joining user relation easily for names in one go unless using include (not interactive with group)
        // Two steps: Group IDs, then fetch Users.

        const grouped = await this.prisma.deal.groupBy({
            by: ['responsible_id'],
            where,
            _count: { id: true },
            _sum: { value: true }
        });

        // Check Won counts per responsible
        const wonGrouped = await this.prisma.deal.groupBy({
            by: ['responsible_id'],
            where: { ...where, status: 'WON' },
            _count: { id: true }
        });

        // Fetch Users
        const userIds = grouped.map(g => g.responsible_id).filter(id => id !== null) as string[];
        const users = await this.prisma.user.findMany({
            where: { id: { in: userIds } },
            select: { id: true, name: true }
        });

        return users.map(user => {
            const stats = grouped.find(g => g.responsible_id === user.id);
            const wonStats = wonGrouped.find(g => g.responsible_id === user.id);

            const total = stats?._count.id || 0;
            const won = wonStats?._count.id || 0;

            return {
                operator_name: user.name,
                total_leads: total,
                total_qualified: won, // using 'qualified' as 'won' for now
                total_value: stats?._sum.value || 0,
                conversion_pct: total > 0 ? (won / total) * 100 : 0
            };
        }).sort((a, b) => b.total_leads - a.total_leads);
    }

    async getExportData(filters: ReportFilterDto, currentUser: User) {
        const where = this.buildWhereClause(filters, currentUser);

        const data = await this.prisma.deal.findMany({
            where,
            include: {
                stage: { select: { name: true } },
                responsible: { select: { name: true } },
                client: { select: { name: true, email: true, phone: true } } // Assuming client relation exists
            },
            orderBy: { created_at: 'desc' },
            take: 5000
        });

        // Flatten for CSV
        return data.map(d => ({
            id: d.id,
            title: d.title,
            client_name: d.client?.name,
            value: d.value,
            stage: d.stage?.name,
            responsible: d.responsible?.name,
            status: d.status,
            created_at: d.created_at
        }));
    }

    // Adapt existing methods to new logic if controller calls them strictly by name
    async getConversionStats(filters: ReportFilterDto, currentUser: User) {
        // Redirect to new dashboard logic
        return this.getDashboardStats(filters, currentUser);
    }
}
