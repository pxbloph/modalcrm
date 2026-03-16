import { Module } from '@nestjs/common';
import { DatabaseSettingsController } from './database-settings.controller';
import { DatabaseSettingsService } from './database-settings.service';
import { SecurityModule } from '../security/security.module';

@Module({
    imports: [SecurityModule],
    controllers: [DatabaseSettingsController],
    providers: [DatabaseSettingsService],
})
export class DatabaseSettingsModule {}
