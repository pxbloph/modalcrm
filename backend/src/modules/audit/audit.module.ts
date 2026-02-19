import { Module, Global } from '@nestjs/common';
import { AuditService } from './audit.service';
import { PrismaModule } from '../../prisma/prisma.module';
import { ClsModule } from 'nestjs-cls';
import { AuditController } from './audit.controller';

@Global()
@Module({
    imports: [PrismaModule, ClsModule],
    providers: [AuditService],
    controllers: [AuditController],
    exports: [AuditService],
})
export class AuditModule { }
