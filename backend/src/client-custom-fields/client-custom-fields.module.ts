import { Module } from '@nestjs/common';
import { ClientCustomFieldsService } from './client-custom-fields.service';
import { ClientCustomFieldsController } from './client-custom-fields.controller';
import { PrismaModule } from '../prisma/prisma.module';

@Module({
    imports: [PrismaModule],
    controllers: [ClientCustomFieldsController],
    providers: [ClientCustomFieldsService],
    exports: [ClientCustomFieldsService]
})
export class ClientCustomFieldsModule { }
