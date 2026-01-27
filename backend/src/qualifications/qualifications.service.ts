import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

import { DealsService } from '../deals/deals.service';

@Injectable()
export class QualificationsService {
    constructor(
        private prisma: PrismaService,
        private dealsService: DealsService
    ) { }

    async getActiveTemplate() {
        return this.prisma.formTemplate.findFirst({
            where: { is_active: true },
            orderBy: { created_at: 'desc' },
        });
    }

    async getTabulationOptions() {
        const template = await this.getActiveTemplate();
        // Extract from template fields if possible
        if (template && template.fields) {
            const fields: any[] = Array.isArray(template.fields) ? template.fields : [];
            // Try to find field with common names for tabulation
            const tabField = fields.find(f =>
                (f.key && f.key.toLowerCase().includes('tabula')) ||
                (f.label && f.label.toLowerCase().includes('tabula')) ||
                (f.name && f.name.toLowerCase().includes('tabula'))
            );
            if (tabField && tabField.options) {
                return tabField.options;
            }
        }
        // Fallback default list
        return [
            'Aguardando abertura',
            'Retornar outro horário',
            'Conta aberta',
            'Sem interesse',
            'Inapto na Receita Federal',
            'Telefone Incorreto',
            'Recusado pelo banco'
        ];
    }

    async saveTemplate(fields: any) {
        // Deactivate others maybe? Or just create new one
        return this.prisma.formTemplate.create({
            data: {
                title: 'Qualificação Padrão',
                fields,
                is_active: true
            }
        })
    }

    async create(clientId: string, data: any, userId: string) {
        console.log("Receiving qualification data:", JSON.stringify(data)); // Low-level debug
        try {
            // Validation: Check client status first
            const client = await this.prisma.client.findUnique({
                where: { id: clientId },
                include: { created_by: true } // Includes creator info if needed
            });
            if (!client) throw new Error('Cliente não encontrado');

            const validStatuses = ['CADASTRADO', 'OK', 'SUCCESS', 'Cadastro salvo com sucesso!'];
            // Case-insensitive check just to be safe
            const isValidStatus = validStatuses.some(s => s.toUpperCase() === client.integration_status?.toUpperCase());

            if (!isValidStatus) {
                throw new Error(`Cliente não apto para qualificação. Status: ${client.integration_status}`);
            }

            // Check if there is any meaningful qualification data
            const hasQualificationData =
                (data.maquininha_atual && data.maquininha_atual.trim() !== '') ||
                (data.faturamento_maquina && Number(data.faturamento_maquina) > 0) ||
                (data.faturamento_mensal && Number(data.faturamento_mensal) > 0) ||
                (data.produto_interesse && data.produto_interesse.trim() !== '') ||
                (data.informacoes_adicionais && data.informacoes_adicionais.trim() !== '') ||
                (data.emite_boletos === true); // Only if explicitly true

            const updateData: any = {};

            if (hasQualificationData) {
                updateData.is_qualified = true;
            }

            if (data.account_opening_date) {
                updateData.account_opening_date = new Date(data.account_opening_date);
            }

            // if (data.client_name) {
            //     updateData.name = data.client_name;
            // }

            // Only update if there is something to update
            if (Object.keys(updateData).length > 0) {
                await this.prisma.client.update({
                    where: { id: clientId },
                    data: updateData
                });
            }

            const agendamentoData = data.agendamento ? new Date(data.agendamento) : null;

            // 1. Create Qualification Record first (to exist in DB)
            const qualification = await this.prisma.qualification.create({
                data: {
                    client_id: clientId,
                    created_by_id: userId,
                    answers: data.answers || {},
                    // Map new fields
                    emite_boletos: data.emite_boletos,
                    maquininha_atual: data.maquininha_atual,
                    faturamento_maquina: data.faturamento_maquina,
                    faturamento_mensal: data.faturamento_mensal,
                    produto_interesse: data.produto_interesse,
                    deseja_receber_ofertas: data.deseja_receber_ofertas,
                    informacoes_adicionais: data.informacoes_adicionais,
                    nome_do_cliente: data.client_name,
                    fase: data.fase,
                    tabulacao: data.tabulacao,
                    agendamento: agendamentoData,

                    // Initialize Integration Status
                    integration_status: 'PENDING',
                    integration_attempts: 0
                } as any,
            });

            // 2. Prepare & Send Webhook via reusable method
            await this.buildAndSendWebhook(client, qualification, data, userId, 'modalcrm');

            return qualification;

        } catch (err) {
            console.error("CRITICAL ERROR in create qualification:", err);
            throw err;
        }
    }

    async updateTabulation(clientId: string, newTabulation: string, user: any) {
        // 1. Find latest qualification
        const quals = await this.prisma.qualification.findMany({
            where: { client_id: clientId },
            orderBy: { created_at: 'desc' },
            take: 1
        });

        if (!quals || quals.length === 0) {
            throw new Error('Nenhuma qualificação encontrada para este cliente.');
        }

        const latestQual = quals[0];
        const oldTabulation = latestQual.tabulacao;

        // Idempotency check
        if (oldTabulation === newTabulation) {
            return { message: 'Tabulação já está atualizada.', status: 'ignored' };
        }

        // 2. Update DB
        const updatedQual = await this.prisma.qualification.update({
            where: { id: latestQual.id },
            data: { tabulacao: newTabulation }
        });

        // 3. Fetch Client for Webhook Data
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
            include: { created_by: true }
        });

        if (!client) throw new Error('Cliente detectado mas não encontrado no DB??');

        // 4. Send Webhook with manual flag
        // Construct data object simulating the original data structure but with updates
        const webhookData = {
            ...latestQual.answers as any, // Spread exisitng JSON answers
            // Override fields from Qual model
            maquininha_atual: latestQual.maquininha_atual,
            produto_interesse: latestQual.produto_interesse,
            faturamento_maquina: latestQual.faturamento_maquina ? Number(latestQual.faturamento_maquina) : 0,
            faturamento_mensal: latestQual.faturamento_mensal ? Number(latestQual.faturamento_mensal) : 0,
            emite_boletos: latestQual.emite_boletos,
            deseja_receber_ofertas: latestQual.deseja_receber_ofertas,
            informacoes_adicionais: latestQual.informacoes_adicionais,
            tabulacao: newTabulation,
            agendamento: latestQual.agendamento,
            account_opening_date: client.account_opening_date // Pass current client date
        };

        const extraMetadata = {
            manual_update: true,
            tabulacao_anterior: oldTabulation,
            updated_by_email: user.email,
            origin: 'manual_supervisor'
        };

        await this.buildAndSendWebhook(client, updatedQual, webhookData, user.id, 'manual_supervisor', extraMetadata);

        return { prior_tabulation: oldTabulation, new_tabulation: newTabulation };
    }

    private async buildAndSendWebhook(client: any, qualification: any, data: any, userId: string, source: string, extraMetadata: any = {}) {
        const payload = {
            lead_id: client.id,
            client_id: client.id,
            tabulacao: data.tabulacao,
            dados_cliente: {
                razao_social: client.name,
                nome_fantasia: client.surname,
                cnpj: client.cnpj,
                email: client.email,
                telefone: client.phone,
                id_bitrix: client.id_bitrix,
                consultor_responsavel: client.created_by ? `${client.created_by.name}${client.created_by.surname ? ' ' + client.created_by.surname : ''}` : null,
                consultor_email: client.created_by?.email
            },
            dados_qualificacao: {
                possui_maquininha: data.maquininha_atual,
                produto_interesse: data.produto_interesse,
                faturamento_maquina_mensal: data.faturamento_maquina,
                faturamento_total_mensal: data.faturamento_mensal,
                emite_boletos: data.emite_boletos,
                deseja_proposta_maquininha: data.deseja_receber_ofertas,
                informacoes_adicionais: data.informacoes_adicionais,
                answers: data.answers,
                agendamento: data.agendamento,
                data_abertura_conta: data.account_opening_date
            },
            metadados: {
                qualified_at: new Date().toISOString(),
                qualified_by: userId,
                source: source,
                qualification_id: qualification.id,
                ...extraMetadata
            }
        };

        try {
            await axios.post('https://n8n.upscales.com.br/webhook/modalcrm-qualificacao', payload);

            await this.prisma.qualification.update({
                where: { id: qualification.id },
                data: {
                    integration_status: 'SENT',
                    last_integration_attempt: new Date(),
                    integration_attempts: (qualification.integration_attempts || 0) + 1,
                    webhook_response: '200 OK'
                }
            });

            // Async sync with Kanban (only on create usually, but safe to call)
            if (source === 'modalcrm') { // Only sync kanban creation on original flow
                await this.syncWithKanban(client, data, userId);
            }

        } catch (webhookError: any) {
            console.error("Webhook Error:", webhookError.message);
            await this.prisma.qualification.update({
                where: { id: qualification.id },
                data: {
                    integration_status: 'FAILED',
                    last_integration_attempt: new Date(),
                    integration_attempts: (qualification.integration_attempts || 0) + 1,
                    webhook_response: webhookError.message || 'Unknown Error'
                }
            });
            // Not re-throwing to avoid breaking the user flow, but logging
        }

    }

    async findByClient(clientId: string) {
        return this.prisma.qualification.findMany({
            where: { client_id: clientId },
            include: { created_by: { select: { name: true } } },
        });
    }

    private async syncWithKanban(client: any, data: any, userId: string) {
        try {
            // 1. Get default pipeline
            const pipeline = await this.prisma.pipeline.findFirst({
                where: { is_default: true }
            });

            if (!pipeline) {
                console.warn("No default pipeline found. Skipping Kanban sync.");
                return;
            }

            // 2. Check for existing OPEN deal
            const existingDeal = await this.prisma.deal.findFirst({
                where: {
                    client_id: client.id,
                    pipeline_id: pipeline.id,
                    status: 'OPEN'
                }
            });

            if (existingDeal) {
                console.log(`Open deal already exists for client ${client.id}. Skipping creation.`);
                return;
            }

            // 3. Create Deal
            await this.dealsService.create({
                title: `${client.name || 'Novo Lead'} - Oportunidade`,
                client_id: client.id,
                pipeline_id: pipeline.id,
                value: data.faturamento_mensal ? Number(data.faturamento_mensal) : undefined,
                responsible_id: userId, // The user performing qualification becomes responsible
                priority: 'NORMAL',
                custom_fields: {
                    // Map known fields if needed, e.g. key: 'valor'
                }
            } as any); // Type assertion until DTO matches perfectly or we fix strictness

            console.log(`Deal created for client ${client.id} in pipeline ${pipeline.name}`);

        } catch (error) {
            console.error("Error syncing with Kanban:", error);
            // Non-blocking error
        }
    }
}
