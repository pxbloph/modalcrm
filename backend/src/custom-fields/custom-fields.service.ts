import { Injectable, NotFoundException } from '@nestjs/common';
import { CreateCustomFieldDto } from './dto/create-custom-field.dto';
import { UpdateCustomFieldDto } from './dto/update-custom-field.dto';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class CustomFieldsService {
  constructor(private readonly prisma: PrismaService) { }

  async create(createCustomFieldDto: CreateCustomFieldDto) {
    return this.prisma.customField.create({
      data: createCustomFieldDto,
    });
  }

  async findAll(pipelineId?: string) {
    const where = pipelineId ? { pipeline_id: pipelineId } : {};
    return this.prisma.customField.findMany({
      where,
    });
  }

  async findOne(id: string) {
    const field = await this.prisma.customField.findUnique({
      where: { id },
    });

    if (!field) {
      throw new NotFoundException(`CustomField with ID ${id} not found`);
    }

    return field;
  }

  async update(id: string, updateCustomFieldDto: UpdateCustomFieldDto) {
    return this.prisma.customField.update({
      where: { id },
      data: updateCustomFieldDto,
    });
  }

  async remove(id: string) {
    return this.prisma.customField.delete({
      where: { id },
    });
  }
}
