import { Module } from '@nestjs/common';
import { KanbanFilterPresetsService } from './kanban-filter-presets.service';
import { KanbanFilterPresetsController } from './kanban-filter-presets.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [KanbanFilterPresetsController],
    providers: [KanbanFilterPresetsService],
    exports: [KanbanFilterPresetsService],
})
export class KanbanFilterPresetsModule { }
