import { Controller, Get, Post, Delete, Body, Param } from '@nestjs/common';
import { TagsService } from './tags.service';

@Controller('tags')
export class TagsController {
    constructor(private readonly tagsService: TagsService) { }

    @Get()
    findAll() {
        return this.tagsService.findAll();
    }

    @Post()
    create(@Body() body: { name: string; color?: string }) {
        return this.tagsService.create(body);
    }

    @Delete(':id')
    delete(@Param('id') id: string) {
        return this.tagsService.delete(id);
    }
}
