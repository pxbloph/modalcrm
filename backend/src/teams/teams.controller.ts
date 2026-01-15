import { Controller, Get, Post, Body, Param, Patch, Delete } from '@nestjs/common';
import { TeamsService } from './teams.service';

@Controller('teams')
export class TeamsController {
    constructor(private readonly teamsService: TeamsService) { }

    @Post()
    create(@Body() createTeamDto: { name: string; supervisorId: string; leaderId?: string }) {
        return this.teamsService.create(createTeamDto);
    }

    @Get()
    findAll() {
        return this.teamsService.findAll();
    }

    @Get(':id')
    findOne(@Param('id') id: string) {
        return this.teamsService.findOne(id);
    }

    @Post(':id/members')
    addMember(@Param('id') id: string, @Body('userId') userId: string) {
        return this.teamsService.addMember(id, userId);
    }

    @Delete(':id/members/:userId')
    removeMember(@Param('id') id: string, @Param('userId') userId: string) {
        return this.teamsService.removeMember(id, userId);
    }

    @Patch(':id')
    update(@Param('id') id: string, @Body() updateTeamDto: { name?: string; supervisorId?: string; leaderId?: string }) {
        return this.teamsService.update(id, updateTeamDto);
    }

    @Delete(':id')
    remove(@Param('id') id: string) {
        return this.teamsService.remove(id);
    }
}
