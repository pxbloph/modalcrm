import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import axios from 'axios';

@Injectable()
export class QualificationsService {
    constructor(private prisma: PrismaService) { }

    async getActiveTemplate() {
        return this.prisma.formTemplate.findFirst({
            where: { is_active: true },
            orderBy: { created_at: 'desc' },
        });
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

            if (data.client_name) {
                updateData.name = data.client_name;
            }

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

            // 2. Prepare Webhook Payload
            const payload = {
                lead_id: client.id,
                client_id: client.id, // Redundancy
                tabulacao: data.tabulacao,
                dados_cliente: {
                    razao_social: client.name,
                    nome_fantasia: client.surname,
                    cnpj: client.cnpj,
                    email: client.email,
                    telefone: client.phone,
                    id_bitrix: client.id_bitrix,
                    consultor_responsavel: client.created_by?.name,
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
                    agendamento: agendamentoData
                },
                metadados: {
                    qualified_at: new Date().toISOString(),
                    qualified_by: userId,
                    source: "modalcrm",
                    qualification_id: qualification.id
                }
            };

            // 3. Send Webhook (Async/Non-blocking but we want result to update DB)
            try {
                await axios.post('https://n8n.upscales.com.br/webhook/modalcrm-qualificacao', payload);

                // Update Success
                await this.prisma.qualification.update({
                    where: { id: qualification.id },
                    data: {
                        integration_status: 'SENT',
                        last_integration_attempt: new Date(),
                        integration_attempts: 1,
                        webhook_response: '200 OK'
                    }
                });
                return { ...qualification, integration_status: 'SENT' };

            } catch (webhookError: any) {
                console.error("Webhook Error:", webhookError.message);
                // Update Failure
                await this.prisma.qualification.update({
                    where: { id: qualification.id },
                    data: {
                        integration_status: 'FAILED',
                        last_integration_attempt: new Date(),
                        integration_attempts: 1,
                        webhook_response: webhookError.message || 'Unknown Error'
                    }
                });
                // Return qualification but with failed status so front knows
                return { ...qualification, integration_status: 'FAILED' };
            }

        } catch (err) {
            console.error("CRITICAL ERROR in create qualification:", err);
            throw err;
        }
    }

    async findByClient(clientId: string) {
        return this.prisma.qualification.findMany({
            where: { client_id: clientId },
            include: { created_by: { select: { name: true } } },
        });
    }
}
