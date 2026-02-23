import { Controller, Get, Post, Patch, Body, Param, Request, UseGuards, Query } from '@nestjs/common';
import { ResponsibilityService } from './responsibility.service';
import { AuthGuard } from '@nestjs/passport';

@Controller('responsibility-requests')
@UseGuards(AuthGuard('jwt'))
export class ResponsibilityController {
    constructor(private readonly responsibilityService: ResponsibilityService) { }

    @Post()
    create(@Body() body: { leadId: string; toUserId: string; reason: string }, @Request() req) {
        // If no toUserId provided, assume current user (Takeover case)
        const targetUserId = body.toUserId || req.user.id;
        return this.responsibilityService.createRequest({ ...body, toUserId: targetUserId }, req.user);
    }

    @Get()
    findAll(@Request() req, @Query() query) {
        return this.responsibilityService.findAll(req.user, query);
    }

    @Patch(':id/approve')
    approve(@Param('id') id: string, @Request() req) {
        return this.responsibilityService.approve(id, req.user);
    }

    @Patch(':id/reject')
    reject(@Param('id') id: string, @Body() body: { comment: string }, @Request() req) {
        return this.responsibilityService.reject(id, req.user, body.comment);
    }
}
