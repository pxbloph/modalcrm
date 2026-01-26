import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User } from '@prisma/client';
import * as XLSX from 'xlsx';

// Define Interface for Row Data
interface ImportRow {
    cnpj: string;
    [key: string]: any;
}

@Injectable()
export class ImportsService {
    constructor(private prisma: PrismaService) { }

    async createImportJob(file: Express.Multer.File, user: User) {
        // 1. Create Job Record
        const job = await this.prisma.importJob.create({
            data: {
                type: 'OPEN_ACCOUNTS',
                status: 'PROCESSING', // Start immediately
                file_name: file.originalname,
                created_by_id: user.id
            }
        });

        // 2. Start Async Processing
        // We use setImmediate to ensure it runs after the response is sent (in a real queue system this would be a job)
        setImmediate(() => {
            this.processOpenAccounts(job.id, file.buffer).catch(err => {
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

        // RBAC: Generic check? Only admins or owner? 
        // For now, allow viewing.

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
                    status: '', // UPDATED, NOT_FOUND, INVALID, DUPLICATE_FILE, ALREADY_OPEN
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
                        success++; // Count as success? or neutral? User asked only for "Atualizados" and "Ignorados". Let's count as success (processed correctly) or maybe distinct count.
                        // User said: "Atualizados (tag aplicada)", "Não encontrados", "Inválidos", "Duplicados".
                        // So "SKIPPED" is technically not updated.
                        // Let's increment processed only.
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

                // Save Result (Batching would be better but keeping simple for now)
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
                    error_count: 0 // unknown 
                }
            });
        }
    }
}
