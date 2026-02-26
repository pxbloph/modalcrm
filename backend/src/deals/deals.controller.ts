import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { AuthGuard } from '@nestjs/passport';
import { ClientsService } from '../clients/clients.service';

@Controller('deals')
export class DealsController {
  constructor(
    private readonly dealsService: DealsService,
    private readonly clientsService: ClientsService
  ) { }

  @UseGuards(AuthGuard('jwt'))
  @Post()
  create(@Body() createDealDto: CreateDealDto, @Request() req) {
    console.log('[DEBUG] DealsController.create - User:', req.user);
    console.log('[DEBUG] DealsController.create - ActorID:', req.user?.id);
    return this.dealsService.create(createDealDto, req.user?.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('ensure-for-client/:clientId')
  ensureForClient(@Param('clientId') clientId: string, @Request() req) {
    return this.dealsService.ensureDealForClient(clientId, req.user.id);
  }

  @Get('counts-by-stage')
  countByStage(
    @Query('pipeline_id') pipelineId?: string,
    @Query('responsible_id') responsibleId?: string,
    @Query('client_id') clientId?: string,
    @Query('tags') tags?: string,
    @Query('search') search?: string,
    @Query('tabulation') tabulation?: string, // [NEW]
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('openAccountStartDate') openAccountStartDate?: string,
    @Query('openAccountEndDate') openAccountEndDate?: string,
  ) {
    return this.dealsService.countByStage(pipelineId, responsibleId, clientId, search, tabulation, startDate, endDate, openAccountStartDate, openAccountEndDate);
  }

  @Get()
  findAll(
    @Query('pipeline_id') pipelineId?: string,
    @Query('responsible_id') responsibleId?: string,
    @Query('client_id') clientId?: string,
    @Query('tags') tags?: string,
    @Query('search') search?: string,
    @Query('tabulation') tabulation?: string, // [NEW]
    @Query('startDate') startDate?: string,
    @Query('endDate') endDate?: string,
    @Query('openAccountStartDate') openAccountStartDate?: string,
    @Query('openAccountEndDate') openAccountEndDate?: string,
  ) {
    console.log('[DEBUG-CONTROLLER] findAll Query:', { pipelineId, responsibleId, clientId, tags, search, tabulation });
    const tagIds = tags ? tags.split(',') : undefined;
    return this.dealsService.findAll(pipelineId, responsibleId, clientId, search, tabulation, startDate, endDate, openAccountStartDate, openAccountEndDate);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto, @Request() req) {
    return this.dealsService.update(id, updateDealDto, req.user.id);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/tabulation')
  async updateTabulation(@Param('id') id: string, @Body() body: { tabulacao: string }, @Request() req) {
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERVISOR') {
      throw new ForbiddenException('Apenas Supervisores podem alterar tabulação manualmente.');
    }

    const deal = await this.dealsService.findOne(id);
    if (!deal.client_id) return { message: 'Deal sem cliente vinculado.' };

    const oldTabulation = (deal.client as any)?.tabulacao || 'Aguardando contato';

    // Update Client directly
    const result = await this.clientsService.update(deal.client_id, { tabulacao: body.tabulacao } as any, req.user);

    // Filter History: Log the change
    await this.dealsService.addHistory(id, 'TABULATION_UPDATE', {
      old: oldTabulation,
      new: body.tabulacao,
      by: req.user.name
    }, req.user.id);

    return {
      success: true,
      prior_tabulation: oldTabulation,
      new_tabulation: body.tabulacao
    };
  }

  @Post(':id/tabulate')
  tabulate(@Param('id') id: string, @Body() body: any) {
    return this.dealsService.tabulate(id, body);
  }

  @Delete(':id')
  remove(@Param('id') id: string) {
    return this.dealsService.remove(id);
  }
}
