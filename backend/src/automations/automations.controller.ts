import { Controller, Get, Post, Body, Patch, Param, Delete, Query } from '@nestjs/common';
import { AutomationsService } from './automations.service';
import { CreateAutomationDto } from './dto/create-automation.dto';

@Controller('automations')
export class AutomationsController {
    constructor(private readonly automationsService: AutomationsService) { }

    @Post()
    create(@Body() createAutomationDto: CreateAutomationDto) {
        return this.automationsService.create(createAutomationDto);
    }

    @Get()
    findAll(@Query('pipeline_id') pipelineId: string) {
        return this.automationsService.findAll(pipelineId);
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.automationsService.findOne(id);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateAutomationDto: any) {
        return this.automationsService.update(id, updateAutomationDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.automationsService.remove(id);
    }
}
