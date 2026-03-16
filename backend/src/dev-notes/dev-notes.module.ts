import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityModule } from '../security/security.module';
import { DevNotesController } from './dev-notes.controller';
import { DevNotesService } from './dev-notes.service';

@Module({
    imports: [PrismaModule, SecurityModule],
    controllers: [DevNotesController],
    providers: [DevNotesService],
})
export class DevNotesModule { }
