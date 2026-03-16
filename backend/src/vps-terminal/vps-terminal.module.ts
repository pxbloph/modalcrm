import { Module } from '@nestjs/common';
import { VpsTerminalController } from './vps-terminal.controller';
import { VpsTerminalService } from './vps-terminal.service';
import { SecurityModule } from '../security/security.module';

@Module({
    imports: [SecurityModule],
    controllers: [VpsTerminalController],
    providers: [VpsTerminalService],
})
export class VpsTerminalModule {}
