import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createCustomFieldDto: any) {
    const { stage_configs, ...fieldData } = createCustomFieldDto;

    return this.prisma.customField.create({
      data: {
        ...fieldData,
        stage_configs: stage_configs ? {
          create: stage_configs.map((cfg: any) => ({
            stage: { connect: { id: cfg.stage_id } },
            is_required: cfg.is_required,
            is_visible: cfg.is_visible
          }))
        } : undefined
      },
      include: { stage_configs: true }
    });
  }

  async findAll(pipelineId?: string) {
    const where = pipelineId ? { pipeline_id: pipelineId } : {};
    return this.prisma.customField.findMany({
      where,
      include: { stage_configs: true }
    });
  }

  async findOne(id: string) {
    const field = await this.prisma.customField.findUnique({
      where: { id },
      include: { stage_configs: true }
    });

    if (!field) {
      throw new NotFoundException(`CustomField with ID ${id} not found`);
    }

    return field;
  }

  async update(id: string, updateCustomFieldDto: any) {
    const { stage_configs, ...fieldData } = updateCustomFieldDto;

    // Transaction to update field data and upsert configs
    return this.prisma.$transaction(async (tx) => {
      const field = await tx.customField.update({
        where: { id },
        data: fieldData
      });

      if (stage_configs && Array.isArray(stage_configs)) {
        // Upsert each config
        for (const cfg of stage_configs) {
          await tx.customFieldStageConfig.upsert({
            where: { field_id_stage_id: { field_id: id, stage_id: cfg.stage_id } },
            create: {
              field_id: id,
              stage_id: cfg.stage_id,
              is_required: cfg.is_required,
              is_visible: cfg.is_visible
            },
            update: {
              is_required: cfg.is_required,
              is_visible: cfg.is_visible
            }
          });
        }
      }

      return tx.customField.findUnique({
        where: { id },
        include: { stage_configs: true }
      });
    });
  }

  async remove(id: string) {
    return this.prisma.customField.delete({
      where: { id },
    });
  }
}
