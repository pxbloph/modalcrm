import { Injectable, NotFoundException, BadRequestException, Inject, forwardRef, ForbiddenException } from '@nestjs/common';
import { CreateDealDto, DealStatus, DealPriority } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { PrismaService } from '../prisma/prisma.service';
import { AutomationsService } from '../automations/automations.service';
import { KanbanGateway } from './kanban.gateway';
import { AuditService } from '../modules/audit/audit.service';
import { Role } from '@prisma/client';

@Injectable()
export class DealsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly automationsService: AutomationsService,
    private readonly kanbanGateway: KanbanGateway,
    private readonly auditService: AuditService,
  ) { }

  async create(createDealDto: CreateDealDto, actorId?: string) {
    const { custom_fields, ...dealData } = createDealDto;

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

    // Validate Constraints
    await this.validateConstraints(dealData.pipeline_id, custom_fields, stageId);
    await this.validateUniqueness(dealData.pipeline_id, dealData.client_id);

    // Transaction to create deal + custom values + history
    const deal = await this.prisma.$transaction(async (tx) => {
      // [FIX] Sync Deal Creation with Client Creation (if client exists)
      let finalCreatedAt = new Date();
      if (dealData.client_id) {
        const client = await tx.client.findUnique({ where: { id: dealData.client_id } });
        if (client) {
          finalCreatedAt = client.created_at;
        }
      }

      const newDeal = await tx.deal.create({
        data: {
          ...dealData,
          responsible_id: dealData.responsible_id || (dealData.client_id ? (await tx.client.findUnique({ where: { id: dealData.client_id } }))?.created_by_id : undefined),
          created_at: finalCreatedAt, // Override with Client Date
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
              actor_id: actorId,
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

    // [AUDIT] Log Deal Creation
    this.auditService.log({
      level: 'INFO',
      event_type: 'DEAL_CREATED',
      entity_type: 'DEAL',
      entity_id: deal.id,
      action: 'CREATE',
      actor_id: actorId, // Passado explicito se vier do service, ou pego do contexto
      before: null,
      after: fullDeal,
      metadata: {
        pipelineId: deal.pipeline_id,
        entity_name: fullDeal.title
      }
    });

    return deal;
  }

  async findAll(pipelineId?: string, responsibleId?: string, clientId?: string, search?: string, tabulation?: string, startDate?: string, endDate?: string, openAccountStartDate?: string, openAccountEndDate?: string) {
    const where = this.buildWhere(pipelineId, responsibleId, clientId, search, tabulation, startDate, endDate, openAccountStartDate, openAccountEndDate);

    return this.prisma.deal.findMany({
      where,
      select: {
        id: true,
        title: true,
        value: true,
        stage_id: true,
        created_at: true,
        updated_at: true,
        pipeline_id: true,
        priority: true,
        status: true,
        // Relations - Optimized for Kanban Card
        stage: {
          select: { id: true, name: true, color: true }
        },
        client: {
          select: {
            id: true,
            name: true,
            surname: true,
            cnpj: true, // Shown in card now
            email: true, // Shown in list view
            phone: true, // Shown in list view
            account_opening_date: true, // Used for 'Contas Abertas' badge
            created_at: true,
            tabulacao: true,
            faturamento_mensal: true,
            agendamento: true
          }
        },
        responsible: {
          select: {
            id: true,
            name: true,
            surname: true,
            // email: true, // Not critical for card avatar
          }
        },
        tags: { // Needed for tags on card
          select: {
            tag: {
              select: { id: true, name: true, color: true }
            }
          }
        }
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async countByStage(pipelineId?: string, responsibleId?: string, clientId?: string, search?: string, tabulation?: string, startDate?: string, endDate?: string, openAccountStartDate?: string, openAccountEndDate?: string) {
    const where = this.buildWhere(pipelineId, responsibleId, clientId, search, tabulation, startDate, endDate, openAccountStartDate, openAccountEndDate);

    const counts = await this.prisma.deal.groupBy({
      by: ['stage_id'],
      _count: { id: true },
      where
    });

    // Convert to easier format: { stage_id: count }
    return counts.reduce((acc, curr) => {
      acc[curr.stage_id] = curr._count.id;
      return acc;
    }, {});
  }

  private buildWhere(pipelineId?: string, responsibleId?: string, clientId?: string, search?: string, tabulation?: string, startDate?: string, endDate?: string, openAccountStartDate?: string, openAccountEndDate?: string) {
    const where: any = { AND: [] };

    if (pipelineId) where.AND.push({ pipeline_id: pipelineId });
    if (responsibleId) {
      where.AND.push({
        client: { created_by_id: responsibleId }
      });
    }
    if (clientId) where.AND.push({ client_id: clientId });

    if (tabulation) {
      where.AND.push({
        client: {
          tabulacao: { contains: tabulation, mode: 'insensitive' }
        }
      });
    }

    if (startDate || endDate) {
      const dateFilter: any = {};
      if (startDate) {
        dateFilter.gte = startDate.length <= 10 ? new Date(`${startDate}T00:00:00.000Z`) : new Date(startDate);
      }
      if (endDate) {
        if (endDate.length <= 10) {
          dateFilter.lte = new Date(`${endDate}T23:59:59.999Z`);
        } else {
          dateFilter.lte = new Date(endDate);
        }
      }
      where.AND.push({ created_at: dateFilter });
    }

    if (openAccountStartDate || openAccountEndDate) {
      const dateFilter: any = {};
      if (openAccountStartDate) {
        dateFilter.gte = openAccountStartDate.length <= 10 ? new Date(`${openAccountStartDate}T00:00:00.000Z`) : new Date(openAccountStartDate);
      }
      if (openAccountEndDate) {
        if (openAccountEndDate.length <= 10) {
          dateFilter.lte = new Date(`${openAccountEndDate}T23:59:59.999Z`);
        } else {
          dateFilter.lte = new Date(openAccountEndDate);
        }
      }
      where.AND.push({ client: { account_opening_date: dateFilter } });
    }

    if (search) {
      where.AND.push({
        OR: [
          { title: { contains: search, mode: 'insensitive' } },
          { client: { name: { contains: search, mode: 'insensitive' } } },
          { client: { surname: { contains: search, mode: 'insensitive' } } },
          { client: { cnpj: { contains: search, mode: 'insensitive' } } },
          { client: { email: { contains: search, mode: 'insensitive' } } },
          { client: { phone: { contains: search, mode: 'insensitive' } } },
        ]
      });
    }

    // Simplifica se houver apenas um elemento ou nenhum
    if (where.AND.length === 0) return {};
    return where;
  }

  async findOne(id: string) {
    const deal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        stage: true,
        client: true,
        responsible: true,

        custom_values: { include: { field: true } },
        history: {
          orderBy: { created_at: 'desc' },
          include: { actor: true }
        },
      },
    });

    if (!deal) {
      throw new NotFoundException(`Deal with ID ${id} not found`);
    }

    // Attach "latest_qualification" flat property for convenience?
    // Frontend handles array[0] fine, sticking to standard return.
    return deal;
  }

  async update(id: string, updateDealDto: UpdateDealDto, actorId?: string) {
    const { custom_fields, ...dealData } = updateDealDto;

    // 1. Fetch current state
    const currentDeal = await this.prisma.deal.findUnique({
      where: { id },
      include: {
        custom_values: { include: { field: true } },
        stage: true,
        responsible: true
      }
    });

    if (!currentDeal) throw new NotFoundException('Deal not found');

    const oldStageId = currentDeal.stage_id;
    const pipelineId = currentDeal.pipeline_id;

    // 2. Perform Update in Transaction
    // [NEW] Check Role for Responsibility Change
    if (updateDealDto.responsible_id && updateDealDto.responsible_id !== currentDeal.responsible_id) {
      if (actorId) {
        const actor = await this.prisma.user.findUnique({ where: { id: actorId } });

        console.log('--- DEBUG DEAL UPDATE (RESPONSIBLE) ---');
        console.log(`Actor ID: ${actorId}`);
        console.log(`Actor Role: ${actor?.role}`);
        console.log(`Target Responsible: ${updateDealDto.responsible_id}`);
        console.log(`Current Responsible: ${currentDeal.responsible_id}`);

        if (actor && (actor.role === Role.OPERATOR || actor.role === Role.LEADER)) {
          console.log('>> BLOCKING DIRECT UPDATE');
          throw new ForbiddenException('Operadores não podem alterar o responsável diretamente. Use a solicitação de troca.');
        }
      }
    }

    const deal = await this.prisma.$transaction(async (tx) => {
      // Update Fields
      if (custom_fields) {
        for (const [key, value] of Object.entries(custom_fields)) {
          const field = await tx.customField.findUnique({
            where: { pipeline_id_key: { pipeline_id: pipelineId, key } }
          });

          if (field) {
            // Check previous value for logging
            const previousVal = currentDeal.custom_values.find(cv => cv.field_id === field.id)?.value;
            const newVal = String(value);

            if (previousVal !== newVal) {
              await tx.dealHistory.create({
                data: {
                  deal_id: id,
                  actor_id: actorId,
                  action: 'FIELD_UPDATE',
                  details: { field: field.label, from: previousVal, to: newVal }
                }
              });
            }

            await tx.dealCustomFieldValue.upsert({
              where: { deal_id_field_id: { deal_id: id, field_id: field.id } },
              create: { deal_id: id, field_id: field.id, value: newVal },
              update: { value: newVal }
            });
          }
        }
      }

      // Track main field changes
      if (dealData.title && dealData.title !== currentDeal.title) {
        await tx.dealHistory.create({
          data: {
            deal_id: id,
            actor_id: actorId,
            action: 'FIELD_UPDATE',
            details: { field: 'Título', from: currentDeal.title, to: dealData.title }
          }
        });
      }
      if (dealData.value !== undefined && Number(dealData.value) !== Number(currentDeal.value)) {
        await tx.dealHistory.create({
          data: {
            deal_id: id,
            actor_id: actorId,
            action: 'FIELD_UPDATE',
            details: { field: 'Valor', from: Number(currentDeal.value), to: Number(dealData.value) }
          }
        });
      }
      if (dealData.status && dealData.status !== currentDeal.status) {
        await tx.dealHistory.create({
          data: {
            deal_id: id,
            actor_id: actorId,
            action: 'STATUS_UPDATE',
            details: { from: currentDeal.status, to: dealData.status }
          }
        });
      }
      if (dealData.responsible_id && dealData.responsible_id !== currentDeal.responsible_id) {
        const newResp = await tx.user.findUnique({ where: { id: dealData.responsible_id } });
        await tx.dealHistory.create({
          data: {
            deal_id: id,
            actor_id: actorId,
            action: 'RESPONSIBLE_UPDATE',
            details: {
              from: currentDeal.responsible?.name || 'Sem responsável',
              to: newResp?.name || 'Sem responsável'
            }
          }
        });

        // [FIX START] Sync Client Ownership (Carteira de Clientes relies on created_by_id)
        if (currentDeal.client_id && actorId) {
          const client = await tx.client.findUnique({ where: { id: currentDeal.client_id } });
          // If client exists and owner is different from new responsible
          if (client && client.created_by_id !== dealData.responsible_id) {
            const oldOwnerId = client.created_by_id;

            // 1. Update Client Owner
            await tx.client.update({
              where: { id: currentDeal.client_id },
              data: { created_by_id: dealData.responsible_id }
            });

            // 2. Create Transfer Audit (Safe check for type)
            if ((tx as any).leadOwnerTransferAudit) {
              await (tx as any).leadOwnerTransferAudit.create({
                data: {
                  lead_id: currentDeal.client_id,
                  old_owner_id: oldOwnerId,
                  new_owner_id: dealData.responsible_id,
                  requested_by_user_id: actorId,
                  mode: 'kanban_transfer',
                  reason: 'Sincronização automática via transferência de card no Kanban'
                }
              });
            }
          }
        }
        // [FIX END]
      }

      if (dealData.stage_id && dealData.stage_id !== currentDeal.stage_id) {
        const newStage = await tx.pipelineStage.findUnique({ where: { id: dealData.stage_id } });
        await tx.dealHistory.create({
          data: {
            deal_id: id,
            actor_id: actorId,
            action: 'STAGE_CHANGE',
            details: {
              from: currentDeal.stage.name,
              to: newStage?.name || 'Desconhecido'
            }
          }
        });
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

    // 3. Trigger Automations
    if (dealData.stage_id && oldStageId && oldStageId !== dealData.stage_id) {
      await this.automationsService.processTriggers(deal.id, 'LEAVE_STAGE', {
        pipeline_id: pipelineId,
        stage_id: oldStageId
      });

      await this.automationsService.processTriggers(deal.id, 'ENTER_STAGE', {
        pipeline_id: pipelineId,
        stage_id: deal.stage_id
      });
    }

    // [AUDIT] Log Update
    const isMove = dealData.stage_id && oldStageId && oldStageId !== dealData.stage_id;
    this.auditService.log({
      level: 'INFO',
      event_type: isMove ? 'DEAL_MOVED' : 'DEAL_UPDATED',
      entity_type: 'DEAL',
      entity_id: id,
      action: isMove ? 'MOVE_STAGE' : 'UPDATE',
      actor_id: actorId,
      before: { stage_id: oldStageId, ...currentDeal },
      after: deal,
      metadata: {
        pipelineId,
        changes: Object.keys(dealData),
        oldStageId: isMove ? oldStageId : undefined,
        newStageId: isMove ? deal.stage_id : undefined,
        entity_name: deal.title
      }
    });

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
    const deal = await this.update(id, updateDto, user_id);

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

  // --- Bulk Actions ---
  async bulkUpdate(ids: string[], updateDto: UpdateDealDto) {
    const { custom_fields, ...dealData } = updateDto;

    // 1. Validate Target Pipeline if moving stages
    if (dealData.stage_id) {
      // Ensure stage belongs to same pipeline? Or assume valid if same pipeline.
      // For simplicity, we assume bulk update is within same context or specific targeted update.
    }

    return this.prisma.$transaction(async (tx) => {
      const results = [];
      for (const id of ids) {
        try {
          // Reuse update logic per deal to ensure automations/history trigger
          // Note: Ideally we refactor 'update' to accept tx, but for now we call standard update defined above 
          // which uses its own tx. NestJS transaction propagation handles this if configured, 
          // but here we might just iterate. For true bulk performance we'd map, but we need side effects.
          // Let's iterate sequentially to ensure correctness of triggers.
          const updated = await this.update(id, updateDto);
          results.push(updated);
        } catch (e) {
          console.error(`Failed to bulk update deal ${id}`, e);
          // Continue or fail? Partial success is better for UX usually.
        }
      }
      return results;
    });
  }

  async bulkRemove(ids: string[]) {
    return this.prisma.deal.deleteMany({
      where: { id: { in: ids } }
    });
  }

  // --- Validation ---

  private async validateConstraints(pipelineId: string, customFields: Record<string, any> = {}, stageId?: string) {
    // 1. Global Required Fields
    const globalRequired = await this.prisma.customField.findMany({
      where: { pipeline_id: pipelineId, is_required: true, is_visible: true }
    });

    // 2. Stage Specific Required Fields
    let stageRequired: any[] = [];
    if (stageId) {
      const stageConfigs = await this.prisma.customFieldStageConfig.findMany({
        where: { stage_id: stageId, is_required: true, is_visible: true },
        include: { field: true }
      });
      stageRequired = stageConfigs.map(cfg => cfg.field);
    }

    // Merge lists (avoid duplicates)
    const allRequired = [...globalRequired];
    for (const f of stageRequired) {
      if (!allRequired.find(r => r.id === f.id)) {
        allRequired.push(f);
      }
    }

    for (const field of allRequired) {
      const value = customFields[field.key];
      // Check if value is strictly missing/empty. 0 or false are valid.
      const isInvalid = value === undefined || value === null || String(value).trim() === '';
      if (isInvalid) {
        throw new BadRequestException(`O campo '${field.label}' é obrigatório nesta etapa.`);
      }
    }
  }

  // Ensure 1 Deal per Client per Pipeline (Optional Config)
  private async validateUniqueness(pipelineId: string, clientId?: string) {
    if (!clientId) return;
    const existing = await this.prisma.deal.findFirst({
      where: {
        pipeline_id: pipelineId,
        client_id: clientId,
        status: { in: [DealStatus.OPEN] } // Only block if Open? Or generally? Assuming Open deals.
      }
    });
    if (existing) {
      throw new BadRequestException(`Este cliente já possui um negócio aberto nesta pipeline.`);
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
      responsible_id: client.created_by_id || userId,
      status: DealStatus.OPEN,
      priority: DealPriority.NORMAL
    } as any, userId);
  }

  async addHistory(id: string, action: string, details: any, actorId: string) {
    return this.prisma.dealHistory.create({
      data: { deal_id: id, action, details, actor_id: actorId }
    });
  }
}
