
import { Controller, Get, Post, Body, Param, UseGuards, Request } from '@nestjs/common';
import { QualificationsService } from './qualifications.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('qualifications')
@UseGuards(AuthGuard('jwt'))
export class QualificationsController {
    constructor(private readonly qualificationsService: QualificationsService) { }

    @Get('template')
    getTemplate() {
        return this.qualificationsService.getActiveTemplate();
    }

    @Get('tabulations')
    getTabulations() {
        return this.qualificationsService.getTabulationOptions();
    }

    @Post('template')
    saveTemplate(@Body() body, @Request() req) {
        if (req.user.role !== 'ADMIN') {
            // Throw Forbidden
            return { error: 'Only admin' };
        }
        return this.qualificationsService.saveTemplate(body.fields);
    }

    @Post(':clientId')
    create(@Param('clientId') clientId: string, @Body() body, @Request() req) {
        return this.qualificationsService.create(clientId, body, req.user.id);
    }

    @Get(':clientId')
    findByClient(@Param('clientId') clientId: string) {
        return this.qualificationsService.findByClient(clientId);
    }
}
