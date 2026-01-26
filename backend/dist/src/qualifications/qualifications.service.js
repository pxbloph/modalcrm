"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.QualificationsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const axios_1 = __importDefault(require("axios"));
const deals_service_1 = require("../deals/deals.service");
let QualificationsService = class QualificationsService {
    constructor(prisma, dealsService) {
        this.prisma = prisma;
        this.dealsService = dealsService;
    }
    async getActiveTemplate() {
        return this.prisma.formTemplate.findFirst({
            where: { is_active: true },
            orderBy: { created_at: 'desc' },
        });
    }
    async getTabulationOptions() {
        const template = await this.getActiveTemplate();
        if (template && template.fields) {
            const fields = Array.isArray(template.fields) ? template.fields : [];
            const tabField = fields.find(f => (f.key && f.key.toLowerCase().includes('tabula')) ||
                (f.label && f.label.toLowerCase().includes('tabula')) ||
                (f.name && f.name.toLowerCase().includes('tabula')));
            if (tabField && tabField.options) {
                return tabField.options;
            }
        }
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
    async saveTemplate(fields) {
        return this.prisma.formTemplate.create({
            data: {
                title: 'Qualificação Padrão',
                fields,
                is_active: true
            }
        });
    }
    async create(clientId, data, userId) {
        console.log("Receiving qualification data:", JSON.stringify(data));
        try {
            const client = await this.prisma.client.findUnique({
                where: { id: clientId },
                include: { created_by: true }
            });
            if (!client)
                throw new Error('Cliente não encontrado');
            const validStatuses = ['CADASTRADO', 'OK', 'SUCCESS', 'Cadastro salvo com sucesso!'];
            const isValidStatus = validStatuses.some(s => s.toUpperCase() === client.integration_status?.toUpperCase());
            if (!isValidStatus) {
                throw new Error(`Cliente não apto para qualificação. Status: ${client.integration_status}`);
            }
            const hasQualificationData = (data.maquininha_atual && data.maquininha_atual.trim() !== '') ||
                (data.faturamento_maquina && Number(data.faturamento_maquina) > 0) ||
                (data.faturamento_mensal && Number(data.faturamento_mensal) > 0) ||
                (data.produto_interesse && data.produto_interesse.trim() !== '') ||
                (data.informacoes_adicionais && data.informacoes_adicionais.trim() !== '') ||
                (data.emite_boletos === true);
            const updateData = {};
            if (hasQualificationData) {
                updateData.is_qualified = true;
            }
            if (Object.keys(updateData).length > 0) {
                await this.prisma.client.update({
                    where: { id: clientId },
                    data: updateData
                });
            }
            const agendamentoData = data.agendamento ? new Date(data.agendamento) : null;
            const qualification = await this.prisma.qualification.create({
                data: {
                    client_id: clientId,
                    created_by_id: userId,
                    answers: data.answers || {},
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
                    integration_status: 'PENDING',
                    integration_attempts: 0
                },
            });
            await this.buildAndSendWebhook(client, qualification, data, userId, 'modalcrm');
            return qualification;
        }
        catch (err) {
            console.error("CRITICAL ERROR in create qualification:", err);
            throw err;
        }
    }
    async updateTabulation(clientId, newTabulation, user) {
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
        if (oldTabulation === newTabulation) {
            return { message: 'Tabulação já está atualizada.', status: 'ignored' };
        }
        const updatedQual = await this.prisma.qualification.update({
            where: { id: latestQual.id },
            data: { tabulacao: newTabulation }
        });
        const client = await this.prisma.client.findUnique({
            where: { id: clientId },
            include: { created_by: true }
        });
        if (!client)
            throw new Error('Cliente detectado mas não encontrado no DB??');
        const webhookData = {
            ...latestQual.answers,
            maquininha_atual: latestQual.maquininha_atual,
            produto_interesse: latestQual.produto_interesse,
            faturamento_maquina: latestQual.faturamento_maquina ? Number(latestQual.faturamento_maquina) : 0,
            faturamento_mensal: latestQual.faturamento_mensal ? Number(latestQual.faturamento_mensal) : 0,
            emite_boletos: latestQual.emite_boletos,
            deseja_receber_ofertas: latestQual.deseja_receber_ofertas,
            informacoes_adicionais: latestQual.informacoes_adicionais,
            tabulacao: newTabulation,
            agendamento: latestQual.agendamento
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
    async buildAndSendWebhook(client, qualification, data, userId, source, extraMetadata = {}) {
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
                agendamento: data.agendamento
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
            await axios_1.default.post('https://n8n.upscales.com.br/webhook/modalcrm-qualificacao', payload);
            await this.prisma.qualification.update({
                where: { id: qualification.id },
                data: {
                    integration_status: 'SENT',
                    last_integration_attempt: new Date(),
                    integration_attempts: (qualification.integration_attempts || 0) + 1,
                    webhook_response: '200 OK'
                }
            });
            if (source === 'modalcrm') {
                await this.syncWithKanban(client, data, userId);
            }
        }
        catch (webhookError) {
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
        }
    }
    async findByClient(clientId) {
        return this.prisma.qualification.findMany({
            where: { client_id: clientId },
            include: { created_by: { select: { name: true } } },
        });
    }
    async syncWithKanban(client, data, userId) {
        try {
            const pipeline = await this.prisma.pipeline.findFirst({
                where: { is_default: true }
            });
            if (!pipeline) {
                console.warn("No default pipeline found. Skipping Kanban sync.");
                return;
            }
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
            await this.dealsService.create({
                title: `${client.name || 'Novo Lead'} - Oportunidade`,
                client_id: client.id,
                pipeline_id: pipeline.id,
                value: data.faturamento_mensal ? Number(data.faturamento_mensal) : undefined,
                responsible_id: userId,
                priority: 'NORMAL',
                custom_fields: {}
            });
            console.log(`Deal created for client ${client.id} in pipeline ${pipeline.name}`);
        }
        catch (error) {
            console.error("Error syncing with Kanban:", error);
        }
    }
};
exports.QualificationsService = QualificationsService;
exports.QualificationsService = QualificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        deals_service_1.DealsService])
], QualificationsService);
//# sourceMappingURL=qualifications.service.js.map