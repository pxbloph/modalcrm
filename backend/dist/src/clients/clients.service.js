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
Object.defineProperty(exports, "__esModule", { value: true });
exports.ClientsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const client_1 = require("@prisma/client");
const deals_service_1 = require("../deals/deals.service");
let ClientsService = class ClientsService {
    constructor(prisma, dealsService) {
        this.prisma = prisma;
        this.dealsService = dealsService;
    }
    async create(data, user) {
        try {
            const client = await this.prisma.client.create({
                data: {
                    ...data,
                    answers: data['answers'] || {},
                    created_by: { connect: { id: user.id } },
                },
            });
            this.createDefaultDeal(client, user.id);
            return client;
        }
        catch (error) {
            if (error.code === 'P2002') {
                const fields = error.meta?.target?.join(', ');
                throw new common_1.ConflictException(`Cliente já existe. Campo duplicado: ${fields || 'Email/CPF/Telefone'}`);
            }
            console.error('Erro ao criar cliente:', error);
            throw new common_1.InternalServerErrorException('Erro ao criar cliente no banco de dados');
        }
    }
    async createDefaultDeal(client, userId) {
        try {
            const pipeline = await this.prisma.pipeline.findFirst({
                where: { is_default: true }
            });
            if (!pipeline)
                return;
            await this.dealsService.create({
                title: `${client.name}`,
                client_id: client.id,
                pipeline_id: pipeline.id,
                responsible_id: userId,
                priority: 'NORMAL'
            });
            console.log(`Deal created for client ${client.id}`);
        }
        catch (e) {
            console.error("Error auto-creating deal:", e);
        }
    }
    async buildFilterConditions(user, query = {}) {
        const { search, startDate, endDate, responsibleId, status, tabulation, hasOpenAccount, openAccountStartDate, openAccountEndDate } = query;
        const andConditions = [];
        if (search) {
            andConditions.push({
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { surname: { contains: search, mode: 'insensitive' } },
                    { cnpj: { contains: search } },
                    { email: { contains: search, mode: 'insensitive' } },
                ]
            });
        }
        if (status) {
            if (status === 'Erro') {
                andConditions.push({
                    integration_status: { contains: 'Erro', mode: 'insensitive' }
                });
            }
            else {
                andConditions.push({ integration_status: status });
            }
        }
        if (responsibleId) {
            andConditions.push({ created_by_id: responsibleId });
        }
        if (startDate || endDate) {
            const dateFilter = {};
            if (startDate) {
                dateFilter.gte = new Date(startDate);
            }
            if (endDate) {
                const end = new Date(endDate);
                if (endDate.length <= 10) {
                    end.setHours(23, 59, 59, 999);
                }
                dateFilter.lte = end;
            }
            andConditions.push({ created_at: dateFilter });
        }
        if (tabulation) {
            try {
                const clientIds = await this.prisma.$queryRaw `
                    SELECT DISTINCT q1."client_id"
                    FROM "qualifications" q1
                    WHERE q1."tabulacao" = ${tabulation}
                    AND NOT EXISTS (
                        SELECT 1 FROM "qualifications" q2
                        WHERE q2."client_id" = q1."client_id"
                        AND q2."created_at" > q1."created_at"
                    )
                `;
                if (clientIds.length > 0) {
                    andConditions.push({ id: { in: clientIds.map(c => c.client_id) } });
                }
                else {
                    andConditions.push({ id: '00000000-0000-0000-0000-000000000000' });
                }
            }
            catch (err) {
                console.error("Erro ao filtrar por tabulação:", err);
            }
        }
        if (openAccountStartDate || openAccountEndDate) {
            const dateFilter = {};
            if (openAccountStartDate) {
                dateFilter.gte = new Date(openAccountStartDate);
            }
            if (openAccountEndDate) {
                const end = new Date(openAccountEndDate);
                if (openAccountEndDate.length <= 10) {
                    end.setHours(23, 59, 59, 999);
                }
                dateFilter.lte = end;
            }
            andConditions.push({ account_opening_date: dateFilter });
        }
        else if (hasOpenAccount === 'true' || hasOpenAccount === true) {
            andConditions.push({ account_opening_date: { not: null } });
        }
        if (user.role === client_1.Role.SUPERVISOR) {
            andConditions.push({
                OR: [
                    { created_by_id: user.id },
                    { created_by: { supervisor_id: user.id } },
                ]
            });
        }
        else if (user.role === client_1.Role.OPERATOR) {
            andConditions.push({ created_by_id: user.id });
        }
        return andConditions.length > 0 ? { AND: andConditions } : {};
    }
    async findAll(user, query = {}) {
        const where = await this.buildFilterConditions(user, query);
        const page = Number(query.page) || 1;
        const limit = Number(query.limit) || 50;
        const skip = (page - 1) * limit;
        const [data, total] = await Promise.all([
            this.prisma.client.findMany({
                where,
                include: {
                    created_by: { select: { name: true, surname: true, email: true } },
                    qualifications: {
                        orderBy: { created_at: 'desc' },
                        take: 1,
                        select: { agendamento: true, tabulacao: true }
                    }
                },
                orderBy: { created_at: 'desc' },
                take: limit,
                skip: skip
            }),
            this.prisma.client.count({ where })
        ]);
        return {
            data,
            meta: {
                total,
                page,
                limit,
                totalPages: Math.ceil(total / limit)
            }
        };
    }
    async update(id, data, user) {
        try {
            console.log(`[UPDATE START] User: ${user.id} Client: ${id}`);
            const client = await this.findOne(id, user);
            if (!client) {
                console.error(`[UPDATE ERROR] Client ${id} not found or access denied`);
                throw new common_1.InternalServerErrorException('Cliente não encontrado ou acesso negado');
            }
            console.log(`[UPDATE RAW] ID: ${id}`, JSON.stringify(data));
            const inputData = data;
            if (inputData.integration_status === 'Cadastro salvo com sucesso!' && inputData.cnpj) {
                console.log(`[UPDATE CLIENT] ID: ${id}`, JSON.stringify(data));
                const duplicate = await this.prisma.client.findUnique({
                    where: { cnpj: inputData.cnpj }
                });
                if (duplicate && duplicate.id !== id) {
                    console.log(`Merging Lead ${id} into existing Client ${duplicate.id} (CNPJ ${inputData.cnpj}) - Triggered by Success Status`);
                    await this.prisma.qualification.updateMany({
                        where: { client_id: id },
                        data: { client_id: duplicate.id }
                    });
                    const { cnpj, ...mergeData } = inputData;
                    const { faturamento_mensal, faturamento_maquina, maquininha_atual, produto_interesse, emite_boletos, deseja_receber_ofertas, informacoes_adicionais, ...cleanClientData } = mergeData;
                    const updatedExisting = await this.prisma.client.update({
                        where: { id: duplicate.id },
                        data: {
                            ...cleanClientData,
                            integration_status: 'Cadastro salvo com sucesso!',
                        }
                    });
                    await this.prisma.client.delete({ where: { id } });
                    return updatedExisting;
                }
            }
            const { faturamento_mensal, faturamento_maquina, maquininha_atual, produto_interesse, emite_boletos, deseja_receber_ofertas, informacoes_adicionais, tabulacao, agendamento, cc_tipo_conta, cc_status, cc_numero, cc_saldo, cc_limite_utilizado, cc_limite_disponivel, card_final, card_status, card_tipo, card_adicionais, card_fatura_aberta_data, card_fatura_aberta_valor, global_dolar, global_euro, prod_multiplos_acessos, prod_c6_pay, prod_c6_tag, prod_debito_automatico, prod_seguros, prod_chaves_pix, prod_web_banking, prod_link_pagamento, prod_boleto_dda, prod_boleto_cobranca, credit_blocklist, credit_score_interno, credit_score_serasa, credit_inadimplencia, limit_cartao_utilizado, limit_cartao_aprovado, limit_cheque_utilizado, limit_cheque_aprovado, limit_parcelado_utilizado, limit_parcelado_aprovado, limit_anticipacao_disponivel, account_opening_date, ...clientData } = data;
            const qualFields = [
                faturamento_mensal, faturamento_maquina, maquininha_atual, produto_interesse, emite_boletos, deseja_receber_ofertas, informacoes_adicionais, tabulacao, agendamento,
                cc_tipo_conta, cc_status, cc_numero, cc_saldo, cc_limite_utilizado, cc_limite_disponivel,
                card_final, card_status, card_tipo, card_adicionais, card_fatura_aberta_data, card_fatura_aberta_valor,
                global_dolar, global_euro,
                prod_multiplos_acessos, prod_c6_pay, prod_c6_tag, prod_debito_automatico, prod_seguros, prod_chaves_pix, prod_web_banking, prod_link_pagamento, prod_boleto_dda, prod_boleto_cobranca,
                credit_blocklist, credit_score_interno, credit_score_serasa, credit_inadimplencia,
                limit_cartao_utilizado, limit_cartao_aprovado, limit_cheque_utilizado, limit_cheque_aprovado, limit_parcelado_utilizado, limit_parcelado_aprovado, limit_anticipacao_disponivel
            ];
            const hasQualificationInfo = qualFields.some(f => f !== undefined);
            const allowedClientFields = [
                'name', 'surname', 'cnpj', 'email', 'phone', 'is_qualified', 'has_open_account', 'answers', 'integration_status',
                'address', 'cnae_main', 'cnae_secondary', 'legal_nature', 'registration_status', 'registration_status_date',
                'opening_date', 'share_capital', 'id_card_bitrix', 'id_contact_bitrix', 'account_opening_date'
            ];
            const cleanClientData = {};
            for (const key of Object.keys(clientData)) {
                if (allowedClientFields.includes(key)) {
                    cleanClientData[key] = clientData[key];
                }
            }
            console.log('[DEBUG] Clean Client Data:', JSON.stringify(cleanClientData));
            if (account_opening_date)
                console.log('[DEBUG] Opening Date:', account_opening_date);
            let updatedClient;
            try {
                updatedClient = await this.prisma.client.update({
                    where: { id },
                    data: {
                        ...cleanClientData,
                        account_opening_date: account_opening_date ? new Date(account_opening_date) : undefined
                    },
                });
            }
            catch (error) {
                console.error('[UPDATE ERROR] Failed to update client (Prisma):', error);
                throw error;
            }
            if (hasQualificationInfo) {
                const latestQual = await this.prisma.qualification.findFirst({
                    where: { client_id: id },
                    orderBy: { created_at: 'desc' }
                });
                const toDec = (val) => val ? new client_1.Prisma.Decimal(val) : undefined;
                const toInt = (val) => val ? Number(val) : undefined;
                const toBool = (val) => val === true || val === 'true';
                const qualDataPayload = {
                    faturamento_mensal: toDec(faturamento_mensal) ?? latestQual?.faturamento_mensal,
                    faturamento_maquina: toDec(faturamento_maquina) ?? latestQual?.faturamento_maquina,
                    maquininha_atual: maquininha_atual ?? latestQual?.maquininha_atual,
                    produto_interesse: produto_interesse ?? latestQual?.produto_interesse,
                    emite_boletos: emite_boletos !== undefined ? toBool(emite_boletos) : latestQual?.emite_boletos,
                    deseja_receber_ofertas: deseja_receber_ofertas !== undefined ? toBool(deseja_receber_ofertas) : latestQual?.deseja_receber_ofertas,
                    informacoes_adicionais: informacoes_adicionais ?? latestQual?.informacoes_adicionais,
                    tabulacao: tabulacao ?? latestQual?.tabulacao,
                    agendamento: agendamento ? new Date(agendamento) : latestQual?.agendamento,
                    cc_tipo_conta: cc_tipo_conta ?? latestQual?.cc_tipo_conta,
                    cc_status: cc_status ?? latestQual?.cc_status,
                    cc_numero: cc_numero ?? latestQual?.cc_numero,
                    cc_saldo: toDec(cc_saldo) ?? latestQual?.cc_saldo,
                    cc_limite_utilizado: toDec(cc_limite_utilizado) ?? latestQual?.cc_limite_utilizado,
                    cc_limite_disponivel: toDec(cc_limite_disponivel) ?? latestQual?.cc_limite_disponivel,
                    card_final: card_final ?? latestQual?.card_final,
                    card_status: card_status ?? latestQual?.card_status,
                    card_tipo: card_tipo ?? latestQual?.card_tipo,
                    card_adicionais: toInt(card_adicionais) ?? latestQual?.card_adicionais,
                    card_fatura_aberta_data: card_fatura_aberta_data ? new Date(card_fatura_aberta_data) : latestQual?.card_fatura_aberta_data,
                    card_fatura_aberta_valor: toDec(card_fatura_aberta_valor) ?? latestQual?.card_fatura_aberta_valor,
                    global_dolar: global_dolar !== undefined ? toBool(global_dolar) : latestQual?.global_dolar,
                    global_euro: global_euro !== undefined ? toBool(global_euro) : latestQual?.global_euro,
                    prod_multiplos_acessos: prod_multiplos_acessos !== undefined ? toBool(prod_multiplos_acessos) : latestQual?.prod_multiplos_acessos,
                    prod_c6_pay: prod_c6_pay !== undefined ? toBool(prod_c6_pay) : latestQual?.prod_c6_pay,
                    prod_c6_tag: prod_c6_tag !== undefined ? toBool(prod_c6_tag) : latestQual?.prod_c6_tag,
                    prod_debito_automatico: prod_debito_automatico !== undefined ? toBool(prod_debito_automatico) : latestQual?.prod_debito_automatico,
                    prod_seguros: prod_seguros !== undefined ? toBool(prod_seguros) : latestQual?.prod_seguros,
                    prod_chaves_pix: prod_chaves_pix !== undefined ? toBool(prod_chaves_pix) : latestQual?.prod_chaves_pix,
                    prod_web_banking: prod_web_banking !== undefined ? toBool(prod_web_banking) : latestQual?.prod_web_banking,
                    prod_link_pagamento: prod_link_pagamento !== undefined ? toBool(prod_link_pagamento) : latestQual?.prod_link_pagamento,
                    prod_boleto_dda: prod_boleto_dda !== undefined ? toBool(prod_boleto_dda) : latestQual?.prod_boleto_dda,
                    prod_boleto_cobranca: prod_boleto_cobranca !== undefined ? toBool(prod_boleto_cobranca) : latestQual?.prod_boleto_cobranca,
                    credit_blocklist: credit_blocklist !== undefined ? toBool(credit_blocklist) : latestQual?.credit_blocklist,
                    credit_score_interno: credit_score_interno ?? latestQual?.credit_score_interno,
                    credit_score_serasa: credit_score_serasa ?? latestQual?.credit_score_serasa,
                    credit_inadimplencia: credit_inadimplencia ?? latestQual?.credit_inadimplencia,
                    limit_cartao_utilizado: toDec(limit_cartao_utilizado) ?? latestQual?.limit_cartao_utilizado,
                    limit_cartao_aprovado: toDec(limit_cartao_aprovado) ?? latestQual?.limit_cartao_aprovado,
                    limit_cheque_utilizado: toDec(limit_cheque_utilizado) ?? latestQual?.limit_cheque_utilizado,
                    limit_cheque_aprovado: toDec(limit_cheque_aprovado) ?? latestQual?.limit_cheque_aprovado,
                    limit_parcelado_utilizado: toDec(limit_parcelado_utilizado) ?? latestQual?.limit_parcelado_utilizado,
                    limit_parcelado_aprovado: toDec(limit_parcelado_aprovado) ?? latestQual?.limit_parcelado_aprovado,
                    limit_anticipacao_disponivel: limit_anticipacao_disponivel ?? latestQual?.limit_anticipacao_disponivel
                };
                if (latestQual) {
                    await this.prisma.qualification.update({
                        where: { id: latestQual.id },
                        data: qualDataPayload
                    });
                }
                else {
                    await this.prisma.qualification.create({
                        data: {
                            client_id: id,
                            created_by_id: user.id,
                            answers: {},
                            ...qualDataPayload
                        }
                    });
                }
                const hasRealData = (maquininha_atual && maquininha_atual.trim() !== '') ||
                    (Number(faturamento_maquina) > 0) ||
                    (Number(faturamento_mensal) > 0) ||
                    (Number(cc_limite_disponivel) > 0) ||
                    (produto_interesse && produto_interesse.trim() !== '') ||
                    (informacoes_adicionais && informacoes_adicionais.trim() !== '') ||
                    (emite_boletos === true);
                if (hasRealData) {
                    await this.prisma.client.update({
                        where: { id },
                        data: { is_qualified: true }
                    });
                }
            }
            return updatedClient;
        }
        catch (fatalError) {
            console.error('[FATAL UPDATE ERROR]', fatalError);
            throw new common_1.InternalServerErrorException('Erro grave ao atualizar cliente. Verifique os logs.');
        }
    }
    async remove(id, user) {
        if (user.role !== client_1.Role.ADMIN) {
            throw new common_1.ConflictException('Apenas admin pode excluir clientes.');
        }
        await this.prisma.qualification.deleteMany({
            where: { client_id: id }
        });
        return this.prisma.client.delete({
            where: { id }
        });
    }
    async qualify(id, user) {
        const client = await this.findOne(id, user);
        if (!client)
            throw new common_1.ConflictException('Cliente não encontrado');
        if (user.role === client_1.Role.OPERATOR && client.created_by_id !== user.id) {
            throw new common_1.ConflictException('Apenas o responsável pode qualificar.');
        }
        const validStatuses = ['CADASTRADO', 'OK', 'SUCCESS', 'Cadastro salvo com sucesso!'];
        if (!validStatuses.includes(client.integration_status)) {
            throw new common_1.ConflictException(`Cliente não pode ser qualificado. Status: ${client.integration_status}`);
        }
        return this.prisma.client.update({
            where: { id },
            data: { is_qualified: true }
        });
    }
    async openAccount(id, user) {
        if (user.role !== client_1.Role.SUPERVISOR && user.role !== client_1.Role.ADMIN) {
            throw new common_1.ConflictException('Apenas Supervisor ou Admin podem marcar Conta Aberta.');
        }
        const client = await this.findOne(id, user);
        if (!client)
            throw new common_1.ConflictException('Cliente não encontrado');
        return this.prisma.client.update({
            where: { id },
            data: { has_open_account: true }
        });
    }
    async getDashboardMetrics(user, query = {}) {
        const where = await this.buildFilterConditions(user, query);
        const [leads, openAccounts, pending] = await Promise.all([
            this.prisma.client.count({
                where: {
                    ...where,
                    integration_status: 'Cadastro salvo com sucesso!'
                }
            }),
            this.prisma.client.count({
                where: {
                    ...where,
                    has_open_account: true
                }
            }),
            this.prisma.client.count({
                where: {
                    ...where,
                    integration_status: { in: ['Pendente', 'Cadastrando', 'Cadastrando...'] }
                }
            })
        ]);
        const conversionRate = leads > 0 ? ((openAccounts / leads) * 100).toFixed(0) : 0;
        return {
            leads: leads,
            accounts: openAccounts,
            pending: pending,
            conversionRate: Number(conversionRate)
        };
    }
    async findOne(id, user) {
        const client = await this.prisma.client.findUnique({
            where: { id },
            include: {
                created_by: true,
                qualifications: {
                    orderBy: { created_at: 'desc' },
                    take: 1
                }
            },
        });
        if (!client)
            return null;
        if (user.role === client_1.Role.ADMIN)
            return client;
        if (user.role === client_1.Role.OPERATOR && client.created_by_id !== user.id)
            return null;
        if (user.role === client_1.Role.SUPERVISOR) {
            if (client.created_by_id === user.id)
                return client;
            if (client.created_by.supervisor_id === user.id)
                return client;
            return null;
        }
        return client;
        return client;
    }
    async checkNotifications(user) {
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000);
        try {
            const qualifications = await this.prisma.$queryRaw `
                SELECT 
                    q.id, 
                    q.agendamento, 
                    q.nome_do_cliente, 
                    q.tabulacao,
                    q.client_id,
                    c.name as client_name, 
                    c.surname as client_surname, 
                    c.phone as client_phone, 
                    c.email as client_email, 
                    c.cnpj as client_cnpj, 
                    c.id as client_id_explicit
                FROM qualifications q
                JOIN clients c ON q.client_id = c.id
                WHERE q.created_by_id = ${user.id}
                AND q.agendamento >= ${oneMinuteAgo}
                AND q.agendamento <= ${now}
            `;
            return qualifications.map(q => ({
                clientName: q.client_name,
                contactName: q.client_surname || q.nome_do_cliente,
                clientId: q.client_id || q.client_id_explicit,
                scheduleTime: q.agendamento,
                phone: q.client_phone,
                email: q.client_email,
                cnpj: q.client_cnpj
            }));
        }
        catch (error) {
            console.error("Error checking notifications:", error);
            return [];
        }
    }
    async removeBulk(ids, user) {
        if (user.role !== client_1.Role.ADMIN) {
            throw new common_1.ConflictException('Apenas admin pode excluir clientes.');
        }
        await this.prisma.qualification.deleteMany({
            where: { client_id: { in: ids } }
        });
        return this.prisma.client.deleteMany({
            where: { id: { in: ids } }
        });
    }
    async openAccountBulk(ids, user) {
        if (user.role !== client_1.Role.SUPERVISOR && user.role !== client_1.Role.ADMIN) {
            throw new common_1.ConflictException('Apenas Supervisor ou Admin podem marcar Conta Aberta.');
        }
        return this.prisma.client.updateMany({
            where: { id: { in: ids } },
            data: { has_open_account: true }
        });
    }
};
exports.ClientsService = ClientsService;
exports.ClientsService = ClientsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService,
        deals_service_1.DealsService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map