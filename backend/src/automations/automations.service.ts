import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
import axios from 'axios';
import { KanbanGateway } from '../deals/kanban.gateway';

@Injectable()
export class AutomationsService {
    constructor(
        private readonly prisma: PrismaService,
        @Inject(forwardRef(() => KanbanGateway))
        private readonly kanbanGateway: KanbanGateway
    ) { }

    // ... existing code ...

    private async executeAction(action: any, dealId: string, context: any) {
        console.log(`Executing Action: ${action.type}`, action);

        try {
            if (action.type === 'SEND_WEBHOOK') {
                // ... same
            }

            else if (action.type === 'MOVE_STAGE') {
                if (!action.target_stage_id) return;
                const deal = await this.prisma.deal.update({
                    where: { id: dealId },
                    data: { stage_id: action.target_stage_id },
                    include: { client: true, responsible: true, stage: true, pipeline: true, tags: { include: { tag: true } } }
                });
                this.kanbanGateway.notifyDealMoved(deal.pipeline_id, deal);
            }

            else if (action.type === 'UPDATE_RESPONSIBLE') {
                if (!action.responsible_id) return;
                const deal = await this.prisma.deal.update({
                    where: { id: dealId },
                    data: { responsible_id: action.responsible_id },
                    include: { client: true, responsible: true, stage: true, pipeline: true, tags: { include: { tag: true } } }
                });
                this.kanbanGateway.notifyDealUpdated(deal.pipeline_id, deal);
            }

            else if (action.type === 'ADD_TAG') {
                if (!action.tag_id) return;
                await this.prisma.dealTag.upsert({
                    where: { deal_id_tag_id: { deal_id: dealId, tag_id: action.tag_id } },
                    create: { deal_id: dealId, tag_id: action.tag_id },
                    update: {}
                });
                // Fetch deal again to notify update
                const deal = await this.prisma.deal.findUnique({
                    where: { id: dealId },
                    include: { client: true, responsible: true, stage: true, pipeline: true, tags: { include: { tag: true } } }
                });
                if (deal) this.kanbanGateway.notifyDealUpdated(deal.pipeline_id, deal);
            }

            else if (action.type === 'REMOVE_TAG') {
                if (!action.tag_id) return;
                await this.prisma.dealTag.deleteMany({
                    where: { deal_id: dealId, tag_id: action.tag_id }
                });
                // Fetch deal again to notify update
                const deal = await this.prisma.deal.findUnique({
                    where: { id: dealId },
                    include: { client: true, responsible: true, stage: true, pipeline: true, tags: { include: { tag: true } } }
                });
                if (deal) this.kanbanGateway.notifyDealUpdated(deal.pipeline_id, deal);
            }

        } catch (error) {
            console.error(`Failed to execute action ${action.type}`, error);
        }
    }

    async create(createAutomationDto: CreateAutomationDto) {
        return this.prisma.automation.create({
            data: {
                name: createAutomationDto.name,
                pipeline_id: createAutomationDto.pipeline_id,
                stage_id: createAutomationDto.stage_id,
                trigger: createAutomationDto.trigger,
                conditions: createAutomationDto.conditions ?? [],
                actions: createAutomationDto.actions,
                is_active: createAutomationDto.is_active ?? true,
            },
        });
    }

    async processTriggers(dealId: string, trigger: string, context: any) {
        console.log(`Checking automations for Deal ${dealId} - Trigger: ${trigger}`);

        const where: any = {
            pipeline_id: context.pipeline_id,
            trigger: trigger as any, // Cast to enum
            is_active: true
        };

        // If trigger is stage-specific, filter by stage
        if (context.stage_id && (trigger === 'ENTER_STAGE' || trigger === 'LEAVE_STAGE')) {
            where.stage_id = context.stage_id;
        }

        const automations = await this.prisma.automation.findMany({ where });

        console.log(`Found ${automations.length} automations matching trigger ${trigger}`);

        for (const auto of automations) {
            // Evaluate Conditions (Basic Implementation)
            if (!this.evaluateConditions(auto.conditions as any[], context)) {
                console.log(`Automation ${auto.name} skipped: conditions not met`);
                continue;
            }

            // Execute Actions
            const actions = auto.actions as any[];
            if (actions && Array.isArray(actions)) {
                for (const action of actions) {
                    await this.executeAction(action, dealId, context);
                }
            }
        }
    }

    private evaluateConditions(conditions: any[], context: any): boolean {
        if (!conditions || conditions.length === 0) return true;
        // Example condition: { field: 'value', operator: 'gt', value: 1000 }
        // For now, return true to allow all. Implementing condition logic requires parsing deal data against rules.
        return true;
    }


    async findAll(pipelineId?: string) {
        const where: any = {};
        if (pipelineId) where.pipeline_id = pipelineId;
        return this.prisma.automation.findMany({ where });
    }

    async findOne(id: string) {
        return this.prisma.automation.findUnique({ where: { id } });
    }

    async update(id: string, data: any) {
        return this.prisma.automation.update({ where: { id }, data });
    }

    async remove(id: string) {
        return this.prisma.automation.delete({ where: { id } });
    }
}
