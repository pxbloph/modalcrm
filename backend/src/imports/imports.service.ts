import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as XLSX from 'xlsx';
import { ClientsService } from '../clients/clients.service';

// Define Interface for Row Data
interface ImportRow {
    cnpj: string;
    [key: string]: any;
}

@Injectable()
export class ImportsService {
    constructor(
        private prisma: PrismaService,
        private clientsService: ClientsService
    ) { }

    async createImportJob(file: Express.Multer.File, user: User, type: 'OPEN_ACCOUNTS' | 'LEADS' = 'OPEN_ACCOUNTS') {
        // 1. Create Job Record
        const job = await this.prisma.importJob.create({
            data: {
                type: type,
                status: 'PROCESSING', // Start immediately
                file_name: file.originalname,
                created_by_id: user.id
            }
        });

        // 2. Start Async Processing
        setImmediate(() => {
            const processFn = type === 'LEADS'
                ? this.processLeadsImport(job.id, file.buffer)
                : this.processOpenAccounts(job.id, file.buffer);

            processFn.catch(err => {
                console.error(`CRITICAL ERROR processing job ${job.id}:`, err);
                this.prisma.importJob.update({
                    where: { id: job.id },
                    data: { status: 'FAILED' }
                }).catch(e => console.error('Failed to update job status to FAILED', e));
            });
        });

        return job;
    }

    async getJobStatus(id: string, user: User) {
        const job = await this.prisma.importJob.findUnique({
            where: { id },
            include: { created_by: { select: { email: true, name: true } } }
        });

        if (!job) throw new NotFoundException('Job not found');
        return job;
    }

    async getJobResults(id: string) {
        const results = await this.prisma.importResult.findMany({
            where: { job_id: id },
            orderBy: { created_at: 'asc' }
        });
        return results;
    }

    private async processOpenAccounts(jobId: string, fileBuffer: Buffer) {
        try {
            // A. Parse File
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows = XLSX.utils.sheet_to_json<ImportRow>(sheet);

            // Update Total
            await this.prisma.importJob.update({
                where: { id: jobId },
                data: { total_records: rows.length }
            });

            let processed = 0;
            let success = 0;
            let errors = 0;
            const processedCNPJs = new Set<string>();

            // B. Iterate Rows
            for (const row of rows) {
                processed++;
                const rawCnpj = String(row['CNPJ'] || row['cnpj'] || '');
                const cleanCnpj = rawCnpj.replace(/[^0-9]/g, '');

                const rowResult = {
                    job_id: jobId,
                    row_data: row as any,
                    status: '',
                    message: ''
                };

                // Validation
                if (!cleanCnpj || cleanCnpj.length !== 14) {
                    rowResult.status = 'INVALID';
                    rowResult.message = 'CNPJ inválido ou ausente';
                    errors++;
                } else if (processedCNPJs.has(cleanCnpj)) {
                    rowResult.status = 'DUPLICATE_FILE';
                    rowResult.message = 'Duplicado no arquivo';
                    errors++;
                } else {
                    processedCNPJs.add(cleanCnpj);

                    // DB Search
                    const client = await this.prisma.client.findUnique({
                        where: { cnpj: cleanCnpj }
                    });

                    if (!client) {
                        rowResult.status = 'NOT_FOUND';
                        rowResult.message = 'Cliente não encontrado na base';
                        errors++;
                    } else if (client.has_open_account) {
                        rowResult.status = 'SKIPPED';
                        rowResult.message = 'Já possui conta aberta';
                        success++;
                    } else {
                        // UPDATE
                        await this.prisma.client.update({
                            where: { id: client.id },
                            data: { has_open_account: true }
                        });
                        rowResult.status = 'UPDATED';
                        rowResult.message = 'Conta marcada como aberta';
                        success++;
                    }
                }

                // Save Result
                await this.prisma.importResult.create({ data: rowResult });

                // Update Job Progress every 50 rows
                if (processed % 50 === 0) {
                    await this.prisma.importJob.update({
                        where: { id: jobId },
                        data: { processed_records: processed }
                    });
                }
            }

            // C. Complete Job
            await this.prisma.importJob.update({
                where: { id: jobId },
                data: {
                    status: 'COMPLETED',
                    processed_records: processed,
                    success_count: success,
                    error_count: errors
                }
            });

        } catch (error: any) {
            console.error(`Error in processOpenAccounts for job ${jobId}`, error);
            await this.prisma.importJob.update({
                where: { id: jobId },
                data: {
                    status: 'FAILED',
                    error_count: 0
                }
            });
        }
    }

    private async processLeadsImport(jobId: string, fileBuffer: Buffer) {
        try {
            const workbook = XLSX.read(fileBuffer, { type: 'buffer' });
            const sheetName = workbook.SheetNames[0];
            const sheet = workbook.Sheets[sheetName];
            const rows: any[] = XLSX.utils.sheet_to_json(sheet);

            const job = await this.prisma.importJob.findUnique({ where: { id: jobId } });
            if (!job) throw new Error('Job lost context');

            await this.prisma.importJob.update({
                where: { id: jobId },
                data: { total_records: rows.length }
            });

            let processed = 0;
            let success = 0;
            let errors = 0;

            for (const row of rows) {
                processed++;
                const result = {
                    job_id: jobId,
                    row_data: row,
                    status: 'PENDING',
                    message: ''
                };

                try {
                    // Normalize Keys
                    const getVal = (keys: string[]) => keys.reduce((acc, k) => acc || row[k], undefined);

                    const cnpjRaw = String(getVal(['CNPJ', 'cnpj', 'Cnpj']) || '').replace(/[^0-9]/g, '');
                    const email = getVal(['Email', 'email', 'E-mail']) || '';
                    const phone = getVal(['Telefone', 'phone', 'Celular']) || '';
                    const name = getVal(['Razão Social', 'Nome', 'name', 'Nome da Empresa']) || '';
                    const surname = getVal(['Nome Sócio', 'Sócio', 'contact', 'surname']) || '';
                    const tabulacao = getVal(['Tabulação', 'Tabulacao', 'tabulation']) || '';

                    if (!cnpjRaw || cnpjRaw.length !== 14) {
                        throw new Error('CNPJ inválido ou ausente');
                    }

                    // Check Existence
                    const existingClient = await this.prisma.client.findUnique({ where: { cnpj: cnpjRaw } });

                    if (existingClient) {
                        // UPDATE via ClientsService to trigger syncs
                        await this.clientsService.update(existingClient.id, {
                            name: name || undefined,
                            surname: surname || undefined,
                            email: email || undefined,
                            phone: phone || undefined,
                            tabulacao: tabulacao || undefined
                        }, { id: job.created_by_id } as any);

                        result.status = 'UPDATED';
                        result.message = 'Lead atualizado com sucesso';
                        success++;
                    } else {
                        // CREATE via ClientsService to trigger syncs
                        const newClient = await this.clientsService.create({
                            cnpj: cnpjRaw,
                            name: name || `Lead ${cnpjRaw}`,
                            surname: surname,
                            email: email,
                            phone: phone,
                            tabulacao: tabulacao || undefined,
                            integration_status: 'CADASTRADO'
                        } as any, { id: job.created_by_id } as any);

                        result.status = 'CREATED';
                        result.message = 'Lead criado com sucesso';
                        success++;
                    }

                } catch (err: any) {
                    result.status = 'ERROR';
                    result.message = err.message || 'Erro desconhecido';
                    errors++;
                }

                await this.prisma.importResult.create({ data: result });

                if (processed % 50 === 0) {
                    await this.prisma.importJob.update({ where: { id: jobId }, data: { processed_records: processed } });
                }
            }

            await this.prisma.importJob.update({
                where: { id: jobId },
                data: {
                    status: 'COMPLETED',
                    processed_records: processed,
                    success_count: success,
                    error_count: errors
                }
            });

        } catch (e: any) {
            console.error("Critical error in processLeadsImport", e);
            await this.prisma.importJob.update({
                where: { id: jobId }, data: { status: 'FAILED' }
            });
        }
    }

}
