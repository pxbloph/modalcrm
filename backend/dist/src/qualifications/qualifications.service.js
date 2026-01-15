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
let QualificationsService = class QualificationsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getActiveTemplate() {
        return this.prisma.formTemplate.findFirst({
            where: { is_active: true },
            orderBy: { created_at: 'desc' },
        });
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
            if (data.client_name) {
                updateData.name = data.client_name;
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
            try {
                await axios_1.default.post('https://n8n.upscales.com.br/webhook/modalcrm-qualificacao', payload);
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
            }
            catch (webhookError) {
                console.error("Webhook Error:", webhookError.message);
                await this.prisma.qualification.update({
                    where: { id: qualification.id },
                    data: {
                        integration_status: 'FAILED',
                        last_integration_attempt: new Date(),
                        integration_attempts: 1,
                        webhook_response: webhookError.message || 'Unknown Error'
                    }
                });
                return { ...qualification, integration_status: 'FAILED' };
            }
        }
        catch (err) {
            console.error("CRITICAL ERROR in create qualification:", err);
            throw err;
        }
    }
    async findByClient(clientId) {
        return this.prisma.qualification.findMany({
            where: { client_id: clientId },
            include: { created_by: { select: { name: true } } },
        });
    }
};
exports.QualificationsService = QualificationsService;
exports.QualificationsService = QualificationsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QualificationsService);
//# sourceMappingURL=qualifications.service.js.map