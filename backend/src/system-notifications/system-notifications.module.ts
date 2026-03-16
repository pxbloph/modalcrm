import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { SecurityModule } from '../security/security.module';
import { SystemNotificationsService } from './system-notifications.service';
import { SystemNotificationsController } from './system-notifications.controller';

@Module({
    imports: [PrismaModule, SecurityModule],
    providers: [SystemNotificationsService],
    controllers: [SystemNotificationsController],
})
export class SystemNotificationsModule { }
