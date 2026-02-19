import { Controller, Get, Post, Body, Patch, Param, Delete, UseGuards, Request } from '@nestjs/common';
import { ClientCustomFieldsService } from './client-custom-fields.service';
import { JwtAuthGuard } from '../auth/jwt-auth.guard';

@Controller('client-custom-fields')
@UseGuards(JwtAuthGuard)
export class ClientCustomFieldsController {
    constructor(private readonly service: ClientCustomFieldsService) { }

    @Get('groups/admin')
    findAllGroupsAdmin(@Request() req) {
        return this.service.findAllGroupsAdmin(req.user);
    }

    @Get('groups')
    findAllGroups(@Request() req) {
        return this.service.findAllGroups(req.user);
    }

    @Post('groups')
    createGroup(@Request() req, @Body() data: any) {
        return this.service.createGroup(req.user, data);
    }

    @Patch('groups/:id')
    updateGroup(@Request() req, @Param('id') id: string, @Body() data: any) {
        return this.service.updateGroup(req.user, id, data);
    }

    @Delete('groups/:id')
    deleteGroup(@Request() req, @Param('id') id: string) {
        return this.service.deleteGroup(req.user, id);
    }

    @Post('groups/reorder')
    reorderGroups(@Request() req, @Body() body: { ids: string[] }) {
        return this.service.reorderGroups(req.user, body.ids);
    }

    // Fields
    @Post('fields')
    createField(@Request() req, @Body() data: any) {
        return this.service.createField(req.user, data);
    }

    @Patch('fields/:id')
    updateField(@Request() req, @Param('id') id: string, @Body() data: any) {
        return this.service.updateField(req.user, id, data);
    }

    @Delete('fields/:id')
    deleteField(@Request() req, @Param('id') id: string) {
        return this.service.deleteField(req.user, id);
    }

    @Post('fields/reorder')
    reorderFields(@Request() req, @Body() body: { ids: string[] }) {
        return this.service.reorderFields(req.user, body.ids);
    }

    // Values (Client Context)
    @Get('values/:clientId')
    getClientValues(@Param('clientId') clientId: string) {
        return this.service.getClientValues(clientId);
    }

    @Post('values/:clientId')
    updateClientValues(@Request() req, @Param('clientId') clientId: string, @Body() values: any) {
        return this.service.updateClientValues(req.user, clientId, values);
    }
}
