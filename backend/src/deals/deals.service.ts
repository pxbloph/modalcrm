import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef } from '@nestjs/common';
import { CreateDealDto, DealStatus, DealPriority } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationsService } from '../automations/automations.service';
import { KanbanGateway } from './kanban.gateway';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly automationsService: AutomationsService,
    private readonly kanbanGateway: KanbanGateway
  ) { }

  async create(createDealDto: CreateDealDto) {
    const { custom_fields, ...dealData } = createDealDto;

    // Validate Constraints
    await this.validateConstraints(dealData.pipeline_id, custom_fields);

    // Determine Stage
    let stageId = dealData.stage_id;
    if (!stageId) {
      const firstStage = await this.prisma.pipelineStage.findFirst({
        where: { pipeline_id: dealData.pipeline_id },
        orderBy: { order_index: 'asc' },
      });
      if (!firstStage) {
        throw new NotFoundException('Pipeline has no stages defined');
      }
      stageId = firstStage.id;
    }

    // Transaction to create deal + custom values + history
    const deal = await this.prisma.$transaction(async (tx) => {
      const newDeal = await tx.deal.create({
        data: {
          ...dealData,
          stage_id: stageId,
          custom_values: custom_fields
            ? {
              create: Object.entries(custom_fields).map(([key, value]) => ({
                field: { connect: { pipeline_id_key: { pipeline_id: dealData.pipeline_id, key } } },
                value: String(value), // Simple storage for now
              })),
            }
            : undefined,
          history: {
            create: {
              action: 'CREATED',
              details: { initial_stage: stageId },
            },
          },
        },
        include: { custom_values: true },
      });

      return newDeal;
    });

    // Fetched full deal for Event emission (need responsible info etc)
    const fullDeal = await this.findOne(deal.id);
    this.kanbanGateway.notifyDealCreated(deal.pipeline_id, fullDeal);

    // Trigger ENTER_STAGE for initial stage
    await this.automationsService.processTriggers(deal.id, 'ENTER_STAGE', {
      pipeline_id: deal.pipeline_id,
      stage_id: deal.stage_id
    });

    return deal;
  }

  async findAll(pipelineId?: string, responsibleId?: string, clientId?: string, tagIds?: string[]) {
    const where: any = {};
    if (pipelineId) where.pipeline_id = pipelineId;
    if (responsibleId) where.responsible_id = responsibleId;
    if (clientId) where.client_id = clientId;

    if (tagIds && tagIds.length > 0) {
      where.tags = {
        some: {
          tag_id: { in: tagIds }
        }
      };
    }

    return this.prisma.deal.findMany({
      where,
      include: {
        stage: true,
        client: true,
        responsible: true,
        tags: { include: { tag: true } },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        stage: true,
        client: {
          include: {
            qualifications: {
              orderBy: { created_at: 'desc' },
              take: 1
            }
          }
        },
        responsible: true,
        tags: { include: { tag: true } },
        custom_values: { include: { field: true } },
        history: { orderBy: { created_at: 'desc' } },
      },
    });

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    // Attach "latest_qualification" flat property for convenience?
    // Frontend handles array[0] fine, sticking to standard return.
    return deal;
  }

  async update(id: string, updateDealDto: UpdateDealDto) {
    const { custom_fields, ...dealData } = updateDealDto;

    // 1. Fetch current state
    const currentDeal = await this.prisma.deal.findUnique({
      where: { id },
      select: { stage_id: true, pipeline_id: true }
    });

    if (!currentDeal) throw new NotFoundException('Deal not found');

    const oldStageId = currentDeal.stage_id;
    const pipelineId = currentDeal.pipeline_id; // Always consistent

    // 2. Perform Update in Transaction
    const deal = await this.prisma.$transaction(async (tx) => {
      // Update Fields
      if (custom_fields) {
        for (const [key, value] of Object.entries(custom_fields)) {
          // Find Field ID
          const field = await tx.customField.findUnique({
            where: { pipeline_id_key: { pipeline_id: pipelineId, key } }
          });

          if (field) {
            await tx.dealCustomFieldValue.upsert({
              where: { deal_id_field_id: { deal_id: id, field_id: field.id } },
              create: { deal_id: id, field_id: field.id, value: String(value) },
              update: { value: String(value) }
            });
          }
        }
      }

      return tx.deal.update({
        where: { id },
        data: dealData,
      });
    });

    // Notify Update (Moved or Just Updated)
    const fullDeal = await this.findOne(deal.id);
    if (dealData.stage_id && oldStageId && oldStageId !== dealData.stage_id) {
      this.kanbanGateway.notifyDealMoved(pipelineId, fullDeal);
    } else {
      this.kanbanGateway.notifyDealUpdated(pipelineId, fullDeal);
    }

    // 3. Trigger Automations (Outside transaction to not block DB, or inside? Outside is safer for now)
    if (dealData.stage_id && oldStageId && oldStageId !== dealData.stage_id) {
      // Trigger LEAVE_STAGE for old stage
      await this.automationsService.processTriggers(deal.id, 'LEAVE_STAGE', {
        pipeline_id: pipelineId,
        stage_id: oldStageId
      });

      // Trigger ENTER_STAGE for new stage
      await this.automationsService.processTriggers(deal.id, 'ENTER_STAGE', {
        pipeline_id: pipelineId,
        stage_id: deal.stage_id
      });
    }

    return deal;
  }

  async tabulate(id: string, data: any) {
    const { status, stage_id, notes, user_id } = data;
    const updateDto: UpdateDealDto = {};

    if (status) {
      // Basic mapping, can be expanded
      if (status.toUpperCase() === 'WON') updateDto.status = DealStatus.WON;
      else if (status.toUpperCase() === 'LOST') updateDto.status = DealStatus.LOST;
      else if (status.toUpperCase() === 'OPEN') updateDto.status = DealStatus.OPEN;
      else if (status.toUpperCase() === 'ABANDONED') updateDto.status = DealStatus.ABANDONED;
    }

    if (stage_id) updateDto.stage_id = stage_id;

    // Update Deal (Triggering Automations if stage changes)
    const deal = await this.update(id, updateDto);

    // Log History
    await this.prisma.dealHistory.create({
      data: {
        deal_id: id,
        action: 'TABULATION',
        details: { notes, status, stage_id },
        actor_id: user_id
      }
    });

    return deal;
  }

  async remove(id: string) {
    return this.prisma.deal.delete({
      where: { id },
    });
  }

  private async validateConstraints(pipelineId: string, customFields: Record<string, any> = {}) {
    const requiredFields = await this.prisma.customField.findMany({
      where: { pipeline_id: pipelineId, is_required: true, is_visible: true }
    });

    for (const field of requiredFields) {
      const value = customFields[field.key];
      // Check if value is strictly missing/empty. 0 or false are valid.
      const isInvalid = value === undefined || value === null || String(value).trim() === '';
      if (isInvalid) {
        throw new BadRequestException(`O campo '${field.label}' é obrigatório.`);
      }
    }
  }

  async ensureDealForClient(clientId: string, userId: string) {
    const existing = await this.prisma.deal.findFirst({
      where: { client_id: clientId, status: DealStatus.OPEN },
      orderBy: { created_at: 'desc' }
    });
    if (existing) return existing;

    const pipeline = await this.prisma.pipeline.findFirst({ where: { is_default: true } });
    if (!pipeline) throw new NotFoundException("Pipeline padrão não encontrado.");

    const client = await this.prisma.client.findUnique({ where: { id: clientId } });
    if (!client) throw new NotFoundException("Cliente não encontrado.");

    // Create via shared method
    return this.create({
      title: `${client.name} - Oportunidade`,
      pipeline_id: pipeline.id,
      responsible_id: userId,
      status: DealStatus.OPEN,
      priority: DealPriority.NORMAL
    } as any);
  }

  async addHistory(id: string, action: string, details: any, actorId: string) {
    return this.prisma.dealHistory.create({
      data: { deal_id: id, action, details, actor_id: actorId }
    });
  }
}
