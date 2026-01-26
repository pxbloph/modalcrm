import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateStageDto } from './dto/create-stage.dto';
import { UpdateStageDto } from './dto/update-stage.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class StagesService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createStageDto: CreateStageDto) {
    return this.prisma.pipelineStage.create({
      data: createStageDto,
    });
  }

  async findAll(pipelineId?: string) {
    const where = pipelineId ? { pipeline_id: pipelineId } : {};
    return this.prisma.pipelineStage.findMany({
      where,
      orderBy: { order_index: 'asc' },
    });
  }

  async findOne(id: string) {
    const stage = await this.prisma.pipelineStage.findUnique({
      where: { id },
    });

    if (!stage) {
      throw new NotFoundException(`Stage with ID ${id} not found`);
    }

    return stage;
  }

  async update(id: string, updateStageDto: UpdateStageDto) {
    return this.prisma.pipelineStage.update({
      where: { id },
      data: updateStageDto,
    });
  }

  async remove(id: string) {
    return this.prisma.pipelineStage.delete({
      where: { id },
    });
  }
}
