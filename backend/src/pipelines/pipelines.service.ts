import { Injectable, NotFoundException } from '@nestjs/common';
import { CreatePipelineDto } from './dto/create-pipeline.dto';
import { UpdatePipelineDto } from './dto/update-pipeline.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class PipelinesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createPipelineDto: CreatePipelineDto) {
    return this.prisma.pipeline.create({
      data: createPipelineDto,
    });
  }

  async findAll() {
    return this.prisma.pipeline.findMany({
      include: {
        stages: {
          orderBy: { order_index: 'asc' },
        },
        _count: {
          select: { deals: true },
        },
      },
      orderBy: { created_at: 'desc' },
    });
  }

  async findOne(id: string) {
    const pipeline = await this.prisma.pipeline.findUnique({
      where: { id },
      include: {
        stages: {
          orderBy: { order_index: 'asc' },
        },
        custom_fields: true,
        automations: true,
      },
    });

    if (!pipeline) {
      throw new NotFoundException(`Pipeline with ID ${id} not found`);
    }

    return pipeline;
  }

  async update(id: string, updatePipelineDto: UpdatePipelineDto) {
    try {
      return await this.prisma.pipeline.update({
        where: { id },
        data: updatePipelineDto,
      });
    } catch (error: any) {
      // Handle known Prisma errors if needed
      throw error;
    }
  }

  async remove(id: string) {
    return this.prisma.pipeline.delete({
      where: { id },
    });
  }

  async clone(id: string) {
    const source = await this.prisma.pipeline.findUnique({
      where: { id },
      include: {
        stages: { orderBy: { order_index: 'asc' } },
        custom_fields: { include: { stage_configs: true } },
        automations: true
      }
    });

    if (!source) throw new NotFoundException('Pipeline not found');

    return this.prisma.$transaction(async (tx) => {
      // 1. Clone Pipeline
      const newPipeline = await tx.pipeline.create({
        data: {
          name: `${source.name} (Cópia)`,
          description: source.description,
          visibility: source.visibility,
          is_active: true
        }
      });

      // 2. Clone Stages & Build Map
      const stageMap = new Map<string, string>();
      for (const stage of source.stages) {
        const newStage = await tx.pipelineStage.create({
          data: {
            pipeline_id: newPipeline.id,
            name: stage.name,
            color: stage.color,
            order_index: stage.order_index,
            sla_minutes: stage.sla_minutes,
            is_active: stage.is_active
          }
        });
        stageMap.set(stage.id, newStage.id);
      }

      // 3. Clone Custom Fields & Stage Configs
      for (const field of source.custom_fields) {
        const newField = await tx.customField.create({
          data: {
            pipeline_id: newPipeline.id,
            key: field.key,
            label: field.label,
            type: field.type,
            options: field.options ?? undefined,
            is_required: field.is_required,
            is_visible: field.is_visible,
            config: field.config ?? undefined
          }
        });

        // Clone Stage Configs for this field
        // Note: usage of 'any' cast to avoid TS issues if type definition isn't fully updated yet in IDE context
        const sourceFieldWithConfigs = field as any;
        if (sourceFieldWithConfigs.stage_configs) {
          for (const config of sourceFieldWithConfigs.stage_configs) {
            if (stageMap.has(config.stage_id)) {
              await tx.customFieldStageConfig.create({
                data: {
                  field_id: newField.id,
                  stage_id: stageMap.get(config.stage_id)!,
                  is_required: config.is_required,
                  is_visible: config.is_visible
                }
              })
            }
          }
        }
      }

      // 4. Clone Automations with ID Remapping
      for (const auto of source.automations) {
        let newStageId: string | null = null;
        if (auto.stage_id) {
          if (stageMap.has(auto.stage_id)) {
            newStageId = stageMap.get(auto.stage_id)!;
          } else {
            continue; // Skip if source stage missing (integrity error)
          }
        }

        // Remap IDs in Actions
        const actions = Array.isArray(auto.actions) ? auto.actions : [];
        const newActions = actions.map((act: any) => {
          // Remap target_stage_id for moves
          if (act.target_stage_id && stageMap.has(act.target_stage_id)) {
            return { ...act, target_stage_id: stageMap.get(act.target_stage_id) };
          }
          return act;
        });

        await tx.automation.create({
          data: {
            pipeline_id: newPipeline.id,
            stage_id: newStageId,
            name: auto.name,
            trigger: auto.trigger,
            conditions: auto.conditions ?? undefined,
            actions: newActions,
            is_active: auto.is_active
          }
        });
      }

      return newPipeline;
    });
  }
}
