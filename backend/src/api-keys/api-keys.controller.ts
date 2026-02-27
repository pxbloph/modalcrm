import { Controller, Get, Post, Delete, Param, Body, UseGuards, Request } from '@nestjs/common';
import { ApiKeysService } from './api-keys.service';
import { AuthGuard } from '@nestjs/passport';
import { CreateApiKeyDto } from './dto/create-api-key.dto';

@Controller('api-keys')
@UseGuards(AuthGuard('jwt'))
export class ApiKeysController {
    constructor(private readonly apiKeysService: ApiKeysService) { }

    @Post()
    create(@Body() dto: CreateApiKeyDto, @Request() req) {
        return this.apiKeysService.create(dto.name, req.user);
    }

    @Get()
    findAll(@Request() req) {
        return this.apiKeysService.findAll(req.user);
    }

    @Delete(':id')
    revoke(@Param('id') id: string, @Request() req) {
        return this.apiKeysService.revoke(id, req.user);
    }
}
