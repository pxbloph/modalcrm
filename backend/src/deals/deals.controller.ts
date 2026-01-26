import { Controller, Get, Post, Body, Patch, Param, Delete, Query, UseGuards, Request, ForbiddenException } from '@nestjs/common';
import { DealsService } from './deals.service';
import { CreateDealDto } from './dto/create-deal.dto';
import { UpdateDealDto } from './dto/update-deal.dto';
import { AuthGuard } from '@nestjs/passport';
import { QualificationsService } from '../qualifications/qualifications.service';

@Controller('deals')
export class DealsController {
  constructor(
    private readonly dealsService: DealsService,
    private readonly qualificationsService: QualificationsService
  ) { }

  @Post()
  create(@Body() createDealDto: CreateDealDto) {
    return this.dealsService.create(createDealDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Post('ensure-for-client/:clientId')
  ensureForClient(@Param('clientId') clientId: string, @Request() req) {
    return this.dealsService.ensureDealForClient(clientId, req.user.id);
  }

  @Get()
  findAll(
    @Query('pipeline_id') pipelineId?: string,
    @Query('responsible_id') responsibleId?: string,
    @Query('client_id') clientId?: string,
    @Query('tags') tags?: string,
  ) {
    const tagIds = tags ? tags.split(',') : undefined;
    return this.dealsService.findAll(pipelineId, responsibleId, clientId, tagIds);
  }

  @Get(':id')
  findOne(@Param('id') id: string) {
    return this.dealsService.findOne(id);
  }

  @Patch(':id')
  update(@Param('id') id: string, @Body() updateDealDto: UpdateDealDto) {
    return this.dealsService.update(id, updateDealDto);
  }

  @UseGuards(AuthGuard('jwt'))
  @Patch(':id/tabulation')
  async updateTabulation(@Param('id') id: string, @Body() body: { tabulacao: string }, @Request() req) {
    // 1. Check Role
    if (req.user.role !== 'ADMIN' && req.user.role !== 'SUPERVISOR') {
      throw new ForbiddenException('Apenas Supervisores podem alterar tabulação manualmente.');
    }

    // 2. Get Deal
    const deal = await this.dealsService.findOne(id);
    if (!deal.client_id) return { message: 'Deal sem cliente vinculado.' };

    // 3. Update Integration/Qualification Service
    const result = await this.qualificationsService.updateTabulation(deal.client_id, body.tabulacao, req.user);

    // 4. Log in Deal History
    await this.dealsService.addHistory(id, 'TABULATION_UPDATE', {
      old: result.prior_tabulation,
      new: result.new_tabulation,
      by: req.user.name
    }, req.user.id);

    return result;
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
