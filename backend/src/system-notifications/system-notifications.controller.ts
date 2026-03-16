import { Controller, Get, Request, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { SystemNotificationsService } from './system-notifications.service';

@Controller('system-notifications')
@UseGuards(AuthGuard('jwt'))
export class SystemNotificationsController {
    constructor(private readonly systemNotificationsService: SystemNotificationsService) { }

    @Get()
    async list(@Request() req: any) {
        return this.systemNotificationsService.listForUser(req.user);
    }
}
