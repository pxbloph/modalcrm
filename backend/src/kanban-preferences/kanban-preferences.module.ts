import { Module } from '@nestjs/common';
import { KanbanPreferencesService } from './kanban-preferences.service';
import { KanbanPreferencesController } from './kanban-preferences.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [KanbanPreferencesController],
    providers: [KanbanPreferencesService],
    exports: [KanbanPreferencesService],
})
export class KanbanPreferencesModule { }
