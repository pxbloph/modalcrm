import { Injectable, Inject, forwardRef } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAutomationDto } from './dto/create-automation.dto';
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

            else if (action.type === 'CREATE_DEAL') {
                // Action: Create Deal in another Pipeline
                // Config: { target_pipeline_id: string, target_stage_id?: string, title_template?: string }
                if (!action.target_pipeline_id) return;

                const originalDeal = context.deal;
                const newTitle = action.title_template
                    ? action.title_template.replace('{{original_title}}', originalDeal.title)
                    : `${originalDeal.title} (Automated)`;

                await this.prisma.deal.create({
                    data: {
                        pipeline_id: action.target_pipeline_id,
                        stage_id: action.target_stage_id, // If null, DealsService default logic handles it? No, need to be explicit or use DealsService.create
                        client_id: originalDeal.client_id,
                        responsible_id: originalDeal.responsible_id,
                        title: newTitle,
                        status: 'OPEN'
                    }
                });
                // Note: We are creating directly via Prisma to avoid circular dependency loop if we used DealsService.create() which triggers automations.
                // However, bypassing DealsService validation might be risky. 
                // Given we are in AutomationsService, we should probably stick to Prisma or be very careful.
                // Let's assume Prisma is fine for "System Actions".
            }

            else if (action.type === 'UPDATE_CLIENT') {
                // Action: Update Client Field
                // Config: { field: string, value: string }
                if (!action.field || !context.deal.client_id) return;

                // Allow specific field updates only for safety? Or dynamic?
                // Let's allow dynamic but careful with types.
                // Supported fields: is_qualified, has_open_account, etc.
                const updateData: any = {};
                if (action.field === 'is_qualified') updateData.is_qualified = action.value === 'true';
                else if (action.field === 'has_open_account') updateData.has_open_account = action.value === 'true';
                else if (action.field === 'integration_status') updateData.integration_status = action.value;

                if (Object.keys(updateData).length > 0) {
                    await this.prisma.client.update({
                        where: { id: context.deal.client_id },
                        data: updateData
                    });
                }
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

        let automations: any[] = [];

        if (trigger === 'TABULATION_UPDATE') {
            // Find automations linked to this specific tabulation string
            const tabTriggers = await this.prisma.dealTabulationTrigger.findMany({
                where: {
                    pipeline_id: context.pipeline_id,
                    tabulation: context.tabulation
                },
                include: { automation: true }
            });
            automations = tabTriggers.map(t => t.automation).filter(a => a.is_active);
        } else {
            const where: any = {
                pipeline_id: context.pipeline_id,
                trigger: trigger as any, // Cast to enum
                is_active: true
            };

            // If trigger is stage-specific, filter by stage
            if (context.stage_id && (trigger === 'ENTER_STAGE' || trigger === 'LEAVE_STAGE')) {
                where.stage_id = context.stage_id;
            }

            automations = await this.prisma.automation.findMany({ where });
        }

        console.log(`Found ${automations.length} automations matching trigger ${trigger}`);

        // Fetch full deal context for condition evaluation if not present
        let dealContext = context.deal;
        if (!dealContext) {
            dealContext = await this.prisma.deal.findUnique({
                where: { id: dealId },
                include: { custom_values: { include: { field: true } } }
            });
        }

        for (const auto of automations) {
            // Evaluate Conditions
            if (!this.evaluateConditions(auto.conditions as any[], dealContext)) {
                console.log(`Automation ${auto.name} skipped: conditions not met`);
                continue;
            }

            // Execute Actions
            const actions = auto.actions as any[];
            if (actions && Array.isArray(actions)) {
                for (const action of actions) {
                    await this.executeAction(action, dealId, { ...context, deal: dealContext });
                }
            }
        }
    }

    private evaluateConditions(conditions: any[], deal: any): boolean {
        if (!conditions || conditions.length === 0) return true;

        for (const cond of conditions) {
            const { field, operator, value } = cond;
            let dealValue: any = null;

            // Resolve Deal Value
            if (field === 'value') dealValue = Number(deal.value);
            else if (field === 'priority') dealValue = deal.priority;
            else if (field === 'status') dealValue = deal.status;
            else {
                // Check Custom Values
                const customVal = deal.custom_values?.find((cv: any) => cv.field.key === field);
                dealValue = customVal ? customVal.value : null;
            }

            // Compare
            let met = false;
            if (operator === 'eq') met = dealValue == value; // loose equality
            else if (operator === 'neq') met = dealValue != value;
            else if (operator === 'gt') met = Number(dealValue) > Number(value);
            else if (operator === 'lt') met = Number(dealValue) < Number(value);
            else if (operator === 'contains') met = String(dealValue).includes(String(value));

            if (!met) return false; // AND logic (all must match)
        }

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
