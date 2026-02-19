import { Controller, Post, Get, Param, UploadedFile, UseInterceptors, UseGuards, Request, Res, NotFoundException } from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ImportsService } from './imports.service';
import { AuthGuard } from '@nestjs/passport';
import { Response } from 'express';
import * as XLSX from 'xlsx';

@Controller('imports')
@UseGuards(AuthGuard('jwt'))
export class ImportsController {
    constructor(private readonly importsService: ImportsService) { }

    @Post('open-accounts')
    @UseInterceptors(FileInterceptor('file'))
    async uploadOpenAccounts(@UploadedFile() file: Express.Multer.File, @Request() req) {
        if (!file) throw new NotFoundException('Arquivo não enviado');
        return this.importsService.createImportJob(file, req.user);
    }

    @Post('leads')
    @UseInterceptors(FileInterceptor('file'))
    async uploadLeads(@UploadedFile() file: Express.Multer.File, @Request() req) {
        if (!file) throw new NotFoundException('Arquivo não enviado');
        // We reuse createImportJob but we need to tell service it's a LEADS import type? 
        // The service logic currently hardcodes 'OPEN_ACCOUNTS' type or we need to pass strict type.
        // Let's modify createImportJob slightly or duplicate.
        // For speed, let's overload createImportJob or create a new one. 
        // Actually, the service.createImportJob stored 'OPEN_ACCOUNTS' hardcoded.
        // I will fix the service in next step or use a new method.
        // Let's assume I fix the service method signature to accept TYPE.
        return this.importsService.createImportJob(file, req.user, 'LEADS');
    }

    @Get('open-accounts/:id')
    async getStatus(@Param('id') id: string, @Request() req) {
        return this.importsService.getJobStatus(id, req.user);
    }

    @Get('open-accounts/:id/download')
    async downloadResult(@Param('id') id: string, @Res() res: Response) {
        const results = await this.importsService.getJobResults(id);

        // Convert to CSV/Excel
        const data = results.map(r => ({
            Status: r.status,
            Mensagem: r.message,
            DadosOriginais: JSON.stringify(r.row_data),
            Data: r.created_at
        }));

        const ws = XLSX.utils.json_to_sheet(data);
        const csv = XLSX.utils.sheet_to_csv(ws);

        res.header('Content-Type', 'text/csv');
        res.attachment(`import_result_${id}.csv`);
        res.send(csv);
    }
}
