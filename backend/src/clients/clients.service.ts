
import { Injectable, ConflictException, InternalServerErrorException, BadRequestException, HttpException, ForbiddenException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role, Prisma } from '@prisma/client';

import { DealsService } from '../deals/deals.service';
import { AutomationsService } from '../automations/automations.service';
import { TabulationsService } from '../tabulations/tabulations.service';
import { ResponsibilityService } from '../modules/responsibility/responsibility.service';
import { forwardRef, Inject } from '@nestjs/common';
import axios from 'axios';
import { SecurityService } from '../security/security.service';


@Injectable()
export class ClientsService {
    constructor(
        private prisma: PrismaService,
        private dealsService: DealsService,
        private automationsService: AutomationsService,
        private tabulationsService: TabulationsService,
        private securityService: SecurityService,
        @Inject(forwardRef(() => ResponsibilityService))
        private responsibilityService: ResponsibilityService
    ) { }

    async create(data: Prisma.ClientCreateInput, user: User) {
        try {
            // Separate Client data from Qualification data
            const {
                // Qualification Fields
                faturamento_mensal, faturamento_maquina, maquininha_atual, produto_interesse,
                emite_boletos, deseja_receber_ofertas, informacoes_adicionais, tabulacao, agendamento,
                account_opening_date, // This is on Client model too but handled specifically

                // Other non-client fields that might be present
                answers,
                skip_auto_deal,
                created_by_id, // Allow override

                ...clientData
            } = data as any;

            // 1. Sanitize Client Data (Allow-list)
            const allowedClientFields = [
                'name', 'surname', 'cnpj', 'email', 'phone', 'is_qualified', 'has_open_account', 'answers', 'integration_status',
                'address', 'cnae_main', 'cnae_secondary', 'legal_nature', 'registration_status', 'registration_status_date',
                'opening_date', 'share_capital', 'id_card_bitrix', 'id_contact_bitrix', 'account_opening_date'
            ];

            const cleanClientData: any = {};
            for (const key of Object.keys(clientData)) {
                if (allowedClientFields.includes(key)) {
                    cleanClientData[key] = clientData[key];
                }
            }

            // Default Integration Status
            if (!cleanClientData.integration_status || cleanClientData.integration_status.trim() === '') {
                cleanClientData.integration_status = 'Cadastrando...';
            }

            // Determine Creator (Admin/Supervisor Override)
            let finalCreatorId = user.id;
            if ((user.role === 'ADMIN' || user.role === 'SUPERVISOR') && created_by_id) {
                finalCreatorId = created_by_id;
            }

            // 2. [REFACTORED] Consolidate Qualification Data directly into Client
            const qualFieldsValues = {
                faturamento_mensal: faturamento_mensal ? new Prisma.Decimal(faturamento_mensal) : undefined,
                faturamento_maquina: faturamento_maquina ? new Prisma.Decimal(faturamento_maquina) : undefined,
                maquininha_atual: maquininha_atual,
                produto_interesse: produto_interesse,
                emite_boletos: emite_boletos !== undefined ? (emite_boletos === true || emite_boletos === 'true') : false,
                deseja_receber_ofertas: deseja_receber_ofertas !== undefined ? (deseja_receber_ofertas === true || deseja_receber_ofertas === 'true') : false,
                informacoes_adicionais: informacoes_adicionais,
                tabulacao: tabulacao || "Aguardando contato",
                agendamento: agendamento ? new Date(agendamento) : null
            };

            const client = await this.prisma.client.create({
                data: {
                    ...cleanClientData,
                    ...qualFieldsValues,
                    account_opening_date: account_opening_date ? new Date(account_opening_date) : null,
                    answers: answers || {},
                    created_by: { connect: { id: finalCreatorId } },
                },
            });

            // 3. Auto-create Deal (Kanban) - Controlled by Flag
            if (!skip_auto_deal) {
                this.createDefaultDeal(client, finalCreatorId);
            }

            return client;
        } catch (error) {
            if (error.code === 'P2002') {
                const fields = error.meta?.target?.join(', ');
                throw new ConflictException(`Cliente já existe. Campo duplicado: ${fields || 'Email/CPF/Telefone'}`);
            }
            console.error('Erro ao criar cliente:', error);
            throw new InternalServerErrorException('Erro ao criar cliente no banco de dados');
        }
    }

    private async createDefaultDeal(client: any, userId: string) {
        try {
            let targetStageId: string | undefined = undefined;
            let targetPipelineId: string | undefined = undefined;

            // 1. Check if the initial tabulation has a target stage
            if (client.tabulacao) {
                const tabConfig = await this.tabulationsService.findByLabel(client.tabulacao);
                if (tabConfig && tabConfig.target_stage_id) {
                    targetStageId = tabConfig.target_stage_id;
                    targetPipelineId = tabConfig.target_stage?.pipeline_id;
                }
            }

            // 2. Determine Pipeline
            let pipeline;
            if (targetPipelineId) {
                pipeline = await this.prisma.pipeline.findUnique({ where: { id: targetPipelineId } });
            }

            if (!pipeline) {
                pipeline = await this.prisma.pipeline.findFirst({ where: { is_default: true } });
            }

            // Fallback: Use first available pipeline
            if (!pipeline) {
                pipeline = await this.prisma.pipeline.findFirst({ orderBy: { created_at: 'asc' } });
            }

            if (!pipeline) {
                console.warn("No pipeline found. Skipping auto-deal creation.");
                return;
            }

            // 3. Create Deal
            await this.dealsService.create({
                title: `${client.name}`,
                client_id: client.id,
                pipeline_id: pipeline.id,
                stage_id: targetStageId, // If undefined, DealsService will pick the first stage
                responsible_id: userId,
                priority: 'NORMAL'
            } as any, userId);

            console.log(`[CLIENTS] Deal auto-created for client ${client.id} (Tab: ${client.tabulacao || 'None'})`);
        } catch (e) {
            console.error("Error auto-creating deal:", e);
        }
    }

    private async buildFilterConditions(
        user: User,
        query: any = {},
        options: { bypassRoleScope?: boolean } = {},
    ): Promise<Prisma.ClientWhereInput> {
        let {
            search,
            startDate, endDate,
            creationDate, // Frontend param
            responsibleId,
            responsible_id, // Also check snake_case
            status,
            tabulation,
            hasOpenAccount,
            openAccountStartDate, openAccountEndDate,
            accountOpeningDate, // Frontend param
            pipelineId,
            pipeline_id, // Also check snake_case
            isQualified
        } = query;
        const andConditions: Prisma.ClientWhereInput[] = [];

        // Consolidate camelCase and snake_case
        const finalResponsibleId = responsibleId || responsible_id;
        const finalPipelineId = pipelineId || pipeline_id;

        // Map Frontend parameters to Backend
        if (creationDate) {
            try {
                const parsed = typeof creationDate === 'string' ? JSON.parse(creationDate) : creationDate;
                if (parsed.from) startDate = parsed.from;
                if (parsed.to) endDate = parsed.to;
            } catch (e) { }
        }

        if (accountOpeningDate) {
            try {
                const parsed = typeof accountOpeningDate === 'string' ? JSON.parse(accountOpeningDate) : accountOpeningDate;
                if (parsed.from) openAccountStartDate = parsed.from;
                if (parsed.to) openAccountEndDate = parsed.to;
            } catch (e) { }
        }
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

        // Pipeline Filter (NEW) - Filter Clients that have at least one deal in this pipeline
        if (finalPipelineId) {
            const dealCondition: any = { pipeline_id: finalPipelineId };
            if (finalResponsibleId) {
                if (finalResponsibleId === 'unassigned') {
                    dealCondition.responsible_id = null;
                } else if (typeof finalResponsibleId === 'string' && finalResponsibleId.includes(',')) {
                    const ids = finalResponsibleId.split(',').map((id: string) => id.trim()).filter(Boolean);
                    dealCondition.responsible_id = { in: ids };
                } else {
                    dealCondition.responsible_id = finalResponsibleId;
                }
            }

            andConditions.push({
                deals: {
                    some: dealCondition
                }
            });
        }

        // Status Filter
        if (status) {
            if (status === 'Erro') {
                andConditions.push({
                    integration_status: { contains: 'Erro', mode: 'insensitive' }
                });
            } else {
                andConditions.push({ integration_status: status });
            }
        }

        if (finalResponsibleId && !finalPipelineId) {
            // Only filter by created_by_id if NO pipeline is selected
            if (finalResponsibleId === 'unassigned') {
                andConditions.push({ created_by_id: null });
            } else {
                andConditions.push({ created_by_id: finalResponsibleId });
            }
        }

        if (isQualified !== undefined) {
            const val = isQualified === 'true' || isQualified === true;
            andConditions.push({ is_qualified: val });
        }

        // Date Range Filter (Creation Date)
        if (startDate || endDate) {
            const dateFilter: Prisma.DateTimeFilter = {};
            if (startDate) {
                dateFilter.gte = startDate.length <= 10 ? new Date(`${startDate}T00:00:00.000Z`) : new Date(startDate);
            }
            if (endDate) {
                dateFilter.lte = endDate.length <= 10 ? new Date(`${endDate}T23:59:59.999Z`) : new Date(endDate);
            }
            andConditions.push({ created_at: dateFilter });
        }

        // Tabulation Filter
        if (tabulation) {
            if (tabulation.includes(',')) {
                const tabs = tabulation.split(',').map((t: string) => t.trim()).filter(Boolean);
                andConditions.push({ tabulacao: { in: tabs } });
            } else {
                andConditions.push({ tabulacao: { contains: tabulation, mode: 'insensitive' } });
            }
        }

        // Conta Aberta Filter (Boolean OR Date Range)
        if (openAccountStartDate || openAccountEndDate) {
            const dateFilter: Prisma.DateTimeFilter = {};
            if (openAccountStartDate) {
                dateFilter.gte = openAccountStartDate.length <= 10 ? new Date(`${openAccountStartDate}T00:00:00.000Z`) : new Date(openAccountStartDate);
            }
            if (openAccountEndDate) {
                dateFilter.lte = openAccountEndDate.length <= 10 ? new Date(`${openAccountEndDate}T23:59:59.999Z`) : new Date(openAccountEndDate);
            }
            andConditions.push({ account_opening_date: dateFilter });
        } else if (hasOpenAccount === 'true' || hasOpenAccount === true) {
            // Fallback: If no dates provided, but checkbox checked -> Just check existence
            andConditions.push({ account_opening_date: { not: null } });
        }

        // RBAC Logic
        if (!options.bypassRoleScope) {
            if (user.role === Role.SUPERVISOR) {
                andConditions.push({
                    OR: [
                        { created_by_id: user.id },
                        { created_by: { supervisor_id: user.id } },
                    ],
                });
            } else if (user.role === Role.OPERATOR) {
                andConditions.push({ created_by_id: user.id });
            }
        }

        return andConditions.length > 0 ? { AND: andConditions } : {};
    }





    async update(id: string, data: Prisma.ClientUpdateInput, user: User) {
        try {
            const client = await this.findOne(id, user);
            if (!client) {
                throw new InternalServerErrorException('Cliente não encontrado ou acesso negado');
            }

            // [BLOCKER] Operadores não podem editar leads não integrados
            if (user?.role === Role.OPERATOR && (client as any).integration_status !== 'Cadastro salvo com sucesso!') {
                throw new ForbiddenException('Lead não integrado: operadores não podem editar este cadastro.');
            }

            // Check for Upsert/Merge Trigger (Lead -> Client promotion)
            const inputData = data as any;
            if (
                inputData.integration_status !== undefined &&
                inputData.integration_status !== client.integration_status &&
                user.role !== Role.ADMIN
            ) {
                await this.securityService.ensurePermission(
                    user.id,
                    'crm.edit_integration_status',
                    'Sem permissão para alterar o status de integração deste lead.',
                );
            }

            if (inputData.integration_status === 'Cadastro salvo com sucesso!' && inputData.cnpj) {
                const duplicate = await this.prisma.client.findUnique({
                    where: { cnpj: inputData.cnpj }
                });

                // If a different client with same CNPJ exists, merge into it
                if (duplicate && duplicate.id !== id) {

                    // 2. Prepare data for generic update on existing client
                    // Remove CNPJ from update to avoid unique constraint if it's identical (it is)
                    // Remove ID as well obviously
                    const { cnpj, ...mergeData } = inputData;

                    // We should also exclude qualification fields from this update payload if they are mixed in 'data'
                    // But the 'data' here is ClientUpdateInput which theoretically shouldn't have qual fields unless typed loosely.
                    // However, in this controller/service, 'data' seems to include everything mixed.
                    // So let's extract client-specific fields using the same destructuring logic as below, 
                    // but we need to do it inside here or replicate it.

                    // Let's rely on the extraction below. We can refactor a bit??
                    // No, simpler to just clean 'mergeData' roughly or let Prisma ignore unknown fields? 
                    // Prisma throws on unknown fields in 'data'.
                    // So we MUST separate them.

                    const {
                        faturamento_mensal, faturamento_maquina, maquininha_atual, produto_interesse,
                        emite_boletos, deseja_receber_ofertas, informacoes_adicionais,
                        ...cleanClientData
                    } = mergeData;

                    const updatedExisting = await this.prisma.client.update({
                        where: { id: duplicate.id },
                        data: {
                            ...cleanClientData,
                            integration_status: 'Cadastro salvo com sucesso!', // Ensure status is set
                            // Preserve original creation info or update? Usually preserve original creator.
                        }
                    });

                    // 3. Delete the temporary Lead
                    await this.prisma.client.delete({ where: { id } });

                    return updatedExisting;
                }
            }

            // [BLOCKER] Trava da Tabulação Expandida
            // Leads sem cadastro aprovado só podem receber tabulações restritas
            if (inputData.tabulacao) {
                const allowedTabulationsForUnsaved = [
                    'Outro ECE',
                    'Recusado pelo banco',
                    'Sem interesse',
                    'Telefone Incorreto',
                    'Já possui conta'
                ];

                const currentStatus = inputData.integration_status !== undefined ? inputData.integration_status : client.integration_status;
                const isApproved = currentStatus === 'Cadastro salvo com sucesso!';

                if (!isApproved && !allowedTabulationsForUnsaved.includes(inputData.tabulacao)) {
                    throw new BadRequestException(`Abertura Bloqueada: Não é possível atribuir a tabulação "${inputData.tabulacao}" porque o cadastro não possui sucesso garantido. Status atual: "${currentStatus || 'Aguardando'}". Para clientes não convertidos, você só pode usar: ${allowedTabulationsForUnsaved.join(', ')}.`);
                }
            }

            // Separate Client data from Qualification data
            const {
                // Original Qual Fields
                faturamento_mensal, faturamento_maquina, maquininha_atual, produto_interesse,
                emite_boletos, deseja_receber_ofertas, informacoes_adicionais, tabulacao, agendamento,

                // NEW: Conta Corrente
                cc_tipo_conta, cc_status, cc_numero, cc_saldo, cc_limite_utilizado, cc_limite_disponivel,

                // NEW: Cartão
                card_final, card_status, card_tipo, card_adicionais, card_fatura_aberta_data, card_fatura_aberta_valor,

                // NEW: Global
                global_dolar, global_euro,

                // NEW: Produtos
                prod_multiplos_acessos, prod_c6_pay, prod_c6_tag, prod_debito_automatico, prod_seguros,
                prod_chaves_pix, prod_web_banking, prod_link_pagamento, prod_boleto_dda, prod_boleto_cobranca,

                // NEW: Limites & Risco
                credit_blocklist, credit_score_interno, credit_score_serasa, credit_inadimplencia,
                limit_cartao_utilizado, limit_cartao_aprovado, limit_cheque_utilizado, limit_cheque_aprovado,
                limit_parcelado_utilizado, limit_parcelado_aprovado, limit_anticipacao_disponivel,

                account_opening_date, // NEW

                ...clientData
            } = data as any;

            // Check if there is ANY qualification data to update/create
            // We check if any of these variables are NOT undefined
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

            // Sanitize Client Data (allow only schema fields)
            const allowedClientFields = [
                'name', 'surname', 'cnpj', 'email', 'phone', 'is_qualified', 'has_open_account', 'answers', 'integration_status',
                'address', 'cnae_main', 'cnae_secondary', 'legal_nature', 'registration_status', 'registration_status_date',
                'opening_date', 'share_capital', 'id_card_bitrix', 'id_contact_bitrix', 'account_opening_date'
            ];

            const cleanClientData: any = {};
            for (const key of Object.keys(clientData)) {
                if (allowedClientFields.includes(key)) {
                    cleanClientData[key] = clientData[key];
                }
            }

            // Update Client directly with combined data
            let updatedClient;
            try {
                // Helper to parse decimals/ints safely
                const toDec = (val: any) => val !== undefined && val !== null ? new Prisma.Decimal(val) : undefined;
                const toInt = (val: any) => val !== undefined && val !== null ? Number(val) : undefined;
                const toBool = (val: any) => val === true || val === 'true';

                // [FIX] Prevent UTC Timezone Shift ONLY on pure dates
                const parseDateSafe = (dateStr: string | undefined | null | Date) => {
                    if (!dateStr) return undefined;
                    // If it's already a Date object (rare but possible internally), return it
                    if (typeof dateStr !== 'string') return dateStr as Date;

                    // Se for apenas uma data reta (YYYY-MM-DD) ou vier cravado como meia-noite UTC absoluto,
                    // assumimos que foi o seletor simples de Data que enviou, e aplicamos o meio-dia local.
                    if (dateStr.length === 10 || dateStr.endsWith('T00:00:00.000Z')) {
                        const pureDate = dateStr.substring(0, 10);
                        return new Date(`${pureDate}T12:00:00.000-03:00`);
                    }

                    // Se houver qualquer outra formatação de hora/minuto embutida, preserva e confia na entrada do User
                    return new Date(dateStr);
                };

                updatedClient = await this.prisma.client.update({
                    where: { id },
                    data: {
                        ...cleanClientData,
                        account_opening_date: parseDateSafe(account_opening_date),

                        // Consolidated Qualification Data
                        faturamento_mensal: toDec(faturamento_mensal),
                        faturamento_maquina: toDec(faturamento_maquina),
                        maquininha_atual: maquininha_atual,
                        produto_interesse: produto_interesse,
                        emite_boletos: emite_boletos !== undefined ? toBool(emite_boletos) : undefined,
                        deseja_receber_ofertas: deseja_receber_ofertas !== undefined ? toBool(deseja_receber_ofertas) : undefined,
                        informacoes_adicionais: informacoes_adicionais,
                        tabulacao: tabulacao,
                        agendamento: agendamento ? new Date(agendamento) : undefined,

                        cc_tipo_conta: cc_tipo_conta,
                        cc_status: cc_status,
                        cc_numero: cc_numero,
                        cc_saldo: toDec(cc_saldo),
                        cc_limite_utilizado: toDec(cc_limite_utilizado),
                        cc_limite_disponivel: toDec(cc_limite_disponivel),

                        card_final: card_final,
                        card_status: card_status,
                        card_tipo: card_tipo,
                        card_adicionais: toInt(card_adicionais),
                        card_fatura_aberta_data: card_fatura_aberta_data ? new Date(card_fatura_aberta_data) : undefined,
                        card_fatura_aberta_valor: toDec(card_fatura_aberta_valor),

                        global_dolar: global_dolar !== undefined ? toBool(global_dolar) : undefined,
                        global_euro: global_euro !== undefined ? toBool(global_euro) : undefined,

                        prod_multiplos_acessos: prod_multiplos_acessos !== undefined ? toBool(prod_multiplos_acessos) : undefined,
                        prod_c6_pay: prod_c6_pay !== undefined ? toBool(prod_c6_pay) : undefined,
                        prod_c6_tag: prod_c6_tag !== undefined ? toBool(prod_c6_tag) : undefined,
                        prod_debito_automatico: prod_debito_automatico !== undefined ? toBool(prod_debito_automatico) : undefined,
                        prod_seguros: prod_seguros !== undefined ? toBool(prod_seguros) : undefined,
                        prod_chaves_pix: prod_chaves_pix !== undefined ? toBool(prod_chaves_pix) : undefined,
                        prod_web_banking: prod_web_banking !== undefined ? toBool(prod_web_banking) : undefined,
                        prod_link_pagamento: prod_link_pagamento !== undefined ? toBool(prod_link_pagamento) : undefined,
                        prod_boleto_dda: prod_boleto_dda !== undefined ? toBool(prod_boleto_dda) : undefined,
                        prod_boleto_cobranca: prod_boleto_cobranca !== undefined ? toBool(prod_boleto_cobranca) : undefined,

                        credit_blocklist: credit_blocklist !== undefined ? toBool(credit_blocklist) : undefined,
                        credit_score_interno: credit_score_interno,
                        credit_score_serasa: credit_score_serasa,
                        credit_inadimplencia: credit_inadimplencia,

                        limit_cartao_utilizado: toDec(limit_cartao_utilizado),
                        limit_cartao_aprovado: toDec(limit_cartao_aprovado),
                        limit_cheque_utilizado: toDec(limit_cheque_utilizado),
                        limit_cheque_aprovado: toDec(limit_cheque_aprovado),
                        limit_parcelado_utilizado: toDec(limit_parcelado_utilizado),
                        limit_parcelado_aprovado: toDec(limit_parcelado_aprovado),
                        limit_anticipacao_disponivel: limit_anticipacao_disponivel
                    },
                });

                // --- CENTRALIZED TABULATION SYNC ---
                await this.syncTabulationToKanban(id, tabulacao, user.id, client.tabulacao);
                // ------------------------------------

                // Check if we should qualify the client
                const hasRealData =
                    (maquininha_atual && maquininha_atual.trim() !== '') ||
                    (Number(faturamento_maquina) > 0) ||
                    (Number(faturamento_mensal) > 0) ||
                    (Number(cc_limite_disponivel) > 0) || // NEW
                    (produto_interesse && produto_interesse.trim() !== '') ||
                    (informacoes_adicionais && informacoes_adicionais.trim() !== '') ||
                    (emite_boletos === true);

                if (hasRealData) {
                    await this.prisma.client.update({
                        where: { id },
                        data: { is_qualified: true }
                    });
                }

                return updatedClient;
            } catch (error) {
                console.error('[UPDATE ERROR] Failed to update client (Prisma):', error);
                throw error;
            }
        } catch (fatalError) {
            console.error('[FATAL UPDATE ERROR]', fatalError);
            if (fatalError instanceof HttpException) {
                throw fatalError;
            }
            throw new InternalServerErrorException('Erro grave ao atualizar cliente. Verifique os logs.');
        }
    }

    async remove(id: string, user: User) {
        if (user.role !== Role.ADMIN) {
            throw new ConflictException('Apenas admin pode excluir clientes.');
        }


        return this.prisma.client.delete({
            where: { id }
        });
    }

    // New action: Qualify (Operator only, own scope)
    async qualify(id: string, user: User) {
        const client = await this.findOne(id, user);
        if (!client) throw new ConflictException('Cliente não encontrado');

        // RBAC Check
        if (user.role === Role.OPERATOR && client.created_by_id !== user.id) {
            throw new ConflictException('Apenas o responsável pode qualificar.');
        }

        // Integration Status Check
        const validStatuses = ['CADASTRADO', 'OK', 'SUCCESS', 'Cadastro salvo com sucesso!'];
        if (!validStatuses.includes(client.integration_status)) {
            throw new ConflictException(`Cliente não pode ser qualificado. Status: ${client.integration_status}`);
        }

        return this.prisma.client.update({
            where: { id },
            data: { is_qualified: true }
        });
    }

    // New action: Open Account (Supervisor/Admin only)
    async openAccount(id: string, user: User) {
        if (user.role !== Role.SUPERVISOR && user.role !== Role.ADMIN) {
            throw new ConflictException('Apenas Supervisor ou Admin podem marcar Conta Aberta.');
        }

        const client = await this.findOne(id, user);
        if (!client) throw new ConflictException('Cliente não encontrado');

        return this.prisma.client.update({
            where: { id },
            data: { has_open_account: true }
        });
    }

    async getDashboardMetrics(user: User, query: any = {}) {
        const where = await this.buildFilterConditions(user, query);



        // Testing raw counts to isolate filters
        // const allUserClients = await this.prisma.client.count({ where: { created_by_id: user.id } });
        // console.log('Total Clients for User (raw):', allUserClients);

        // PENDENTES: "Pendente" OR "Cadastrando" OR "Cadastrando..."
        // CONTAS: has_open_account = true (Usually subset of Leads, but let's count strict per rule)
        // Rule: "Contas = total de leads com a tag 'has_open_account' = true" implies checking within the successful leads?
        // Actually, logic usually is standalone count, but let's follow standard "conversion funnel".
        // If has_open_account=true, it SHOULD be a Lead ("Cadastro salvo com sucesso!"), but let's trust the flag.

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

        // Conversion: (Contas / Leads) * 100
        const conversionRate = leads > 0 ? ((openAccounts / leads) * 100).toFixed(0) : 0;

        return {
            leads: leads,
            accounts: openAccounts,
            pending: pending,
            conversionRate: Number(conversionRate)
        };
    }

    async findAll(user: User, query: any = {}) {
        const where = await this.buildFilterConditions(user, query);
        // Optimized query with specific select
        const clients = await this.prisma.client.findMany({
            where,
            select: {
                id: true,
                name: true,
                surname: true,
                cnpj: true,
                email: true,
                phone: true,
                integration_status: true,
                is_qualified: true,
                has_open_account: true,
                created_at: true,
                created_by: { // Renamed from 'responsible' to 'created_by' to match schema
                    select: { id: true, name: true, surname: true }
                },
                tabulacao: true,
                faturamento_mensal: true
            },
            orderBy: { created_at: 'desc' },
            // TODO: Implement pagination args (skip/take) efficiently in next step if requested
        });

        return clients;
    }

    async findOne(id: string, user: User) {
        const client = await this.prisma.client.findUnique({
            where: { id },
            include: {
                created_by: true,
                deals: {
                    where: { status: 'OPEN' },
                    take: 1,
                    orderBy: { created_at: 'desc' }
                }
            },
        });

        if (!client) return null;

        if (user.role === Role.ADMIN) return client;
        if (user.role === Role.OPERATOR && client.created_by_id !== user.id) return null;
        if (user.role === Role.SUPERVISOR) {
            if (client.created_by_id === user.id) return client;
            if (client.created_by.supervisor_id === user.id) return client;
            return null;
        }
        return client;
        return client;
    }

    async checkNotifications(user: User) {
        const now = new Date();
        const oneMinuteAgo = new Date(now.getTime() - 60000); // Check window: last 60 seconds

        // Using queryRaw to bypass Prisma Client validation issues if schema isn't regenerated
        try {
            const scheduledClients: any[] = await this.prisma.$queryRaw`
                SELECT 
                    c.id, 
                    c.agendamento, 
                    c.name as client_name, 
                    c.surname as client_surname, 
                    c.phone as client_phone, 
                    c.email as client_email, 
                    c.cnpj as client_cnpj, 
                    c.tabulacao
                FROM clients c
                WHERE c.created_by_id = ${user.id}
                AND c.agendamento >= ${oneMinuteAgo}
                AND c.agendamento <= ${now}
            `;

            return scheduledClients.map(q => ({
                clientName: q.client_name,
                contactName: q.client_surname || q.name,
                clientId: q.id,
                scheduleTime: q.agendamento,
                phone: q.client_phone,
                email: q.client_email,
                cnpj: q.client_cnpj
            }));
        } catch (error) {
            console.error("Error checking notifications:", error);
            return [];
        }
    }
    async removeBulk(ids: string[], user: User) {
        if (user.role !== Role.ADMIN) {
            throw new ConflictException('Apenas admin pode excluir clientes.');
        }


        return this.prisma.client.deleteMany({
            where: { id: { in: ids } }
        });
    }

    async openAccountBulk(ids: string[], user: User) {
        if (user.role !== Role.SUPERVISOR && user.role !== Role.ADMIN) {
            throw new ConflictException('Apenas Supervisor ou Admin podem marcar Conta Aberta.');
        }

        return this.prisma.client.updateMany({
            where: { id: { in: ids } },
            data: { has_open_account: true }
        });
    }

    async exportClients(user: User, query: any = {}) {
        const canExportAllLeads = await this.securityService.userHasPermission(user.id, 'crm.export_all_leads');
        const where = await this.buildFilterConditions(user, query, {
            bypassRoleScope: canExportAllLeads,
        });
        const { columns } = query; // IDs from frontend

        const visibleColumns: string[] = Array.isArray(columns) ? columns : (typeof columns === 'string' ? columns.split(',') : []);

        const clients = await this.prisma.client.findMany({
            where,
            include: {
                created_by: { select: { name: true, surname: true } },
                deals: {
                    where: { status: 'OPEN' },
                    include: { stage: true },
                    take: 1,
                    orderBy: { created_at: 'desc' }
                }
            },
            orderBy: { created_at: 'desc' }
        });

        if (clients.length === 0) return [];

        // Mapper: Frontend ID -> Data Resolver
        const mapper: Record<string, (c: any) => any> = {
            'title': (c) => c.deals?.[0]?.title || 'Sem negócio',
            'stage_name': (c) => c.deals?.[0]?.stage?.name || '-',
            'value': (c) => c.deals?.[0]?.value ? Number(c.deals?.[0]?.value) : 0,
            'created_at': (c) => c.created_at,
            'responsible': (c) => c.created_by ? `${c.created_by.name} ${c.created_by.surname || ''}`.trim() : 'Sem responsável',
            'client_name': (c) => c.name,
            'client_surname': (c) => c.surname,
            'client_cnpj': (c) => c.cnpj,
            'client_email': (c) => c.email,
            'client_phone': (c) => c.phone,
            'client_city': (c) => c.address,
            'qual_fat_mensal': (c) => c.faturamento_mensal ? Number(c.faturamento_mensal) : 0,
            'qual_fat_maq': (c) => c.faturamento_maquina ? Number(c.faturamento_maquina) : 0,
            'qual_maq_atual': (c) => c.maquininha_atual,
            'qual_tabulacao': (c) => c.tabulacao,
            'qual_agendamento': (c) => c.agendamento,
            'account_opening_date': (c) => c.account_opening_date,
            'qual_cc_banco': (c) => c.cc_tipo_conta,
            'qual_cc_saldo': (c) => c.cc_saldo ? Number(c.cc_saldo) : 0,
            'qual_cc_limite': (c) => c.cc_limite_disponivel ? Number(c.cc_limite_disponivel) : 0,
            'qual_card_tipo': (c) => c.card_tipo,
            'qual_card_limite': (c) => c.limit_cartao_aprovado ? Number(c.limit_cartao_aprovado) : 0,
            'qual_card_fatura': (c) => c.card_fatura_aberta_valor ? Number(c.card_fatura_aberta_valor) : 0,
        };

        const columnsToExport = visibleColumns.length > 0
            ? visibleColumns
            : ['created_at', 'title', 'client_name', 'client_cnpj', 'client_email', 'client_phone', 'responsible', 'qual_tabulacao'];

        const labels: Record<string, string> = {
            'title': 'Negócio',
            'stage_name': 'Etapa',
            'value': 'Valor',
            'created_at': 'Data Criação',
            'responsible': 'Responsável',
            'client_name': 'Razão Social',
            'client_surname': 'Sócio',
            'client_cnpj': 'CNPJ',
            'client_email': 'Email',
            'client_phone': 'Telefone',
            'client_city': 'Endereço',
            'qual_fat_mensal': 'Fat. Mensal',
            'qual_fat_maq': 'Fat. Máquina',
            'qual_maq_atual': 'Máquina Atual',
            'qual_tabulacao': 'Tabulação',
            'qual_agendamento': 'Agendamento',
            'account_opening_date': 'Abertura Conta',
            'qual_cc_banco': 'Banco',
            'qual_cc_saldo': 'Saldo CC',
            'qual_cc_limite': 'Limite CC',
            'qual_card_tipo': 'Tipo Cartão',
            'qual_card_limite': 'Limite Cartão',
            'qual_card_fatura': 'Fatura Cartão',
        };

        return clients.map(client => {
            const row: any = {};
            columnsToExport.forEach(colId => {
                const resolver = mapper[colId];
                const label = labels[colId] || colId;
                let value = resolver ? resolver(client) : (client as any)[colId];
                if (value instanceof Date) {
                    value = value.toISOString();
                } else if (value === null || value === undefined) {
                    value = '';
                }
                row[label] = value;
            });
            return row;
        });
    }

    // --- TAKEOVER FUNCTIONALITY ---

    private getOwnerDisplayName(owner?: { name?: string; surname?: string } | null) {
        if (!owner?.name) return 'Sem responsável';
        return `${owner.name} ${owner.surname || ''}`.trim();
    }

    private isLeadEligibleForOperatorPull(client: any) {
        const integrated = client?.integration_status === 'Cadastro salvo com sucesso!';

        return {
            eligible: integrated,
            reason: `Lead não apto para seguir. Status atual: ${client?.integration_status || 'não informado'}.`,
        };
    }

    private isLeadWaitingExternalRegistration(client: any) {
        const status = (client?.integration_status || '').trim().toLowerCase();
        return status === 'cadastrando...';
    }

    private async findActiveLeadByCnpj(cnpj: string) {
        const cleanCnpj = cnpj.replace(/\D/g, '');
        if (!cleanCnpj) throw new ConflictException('CNPJ inválido');

        return this.prisma.client.findFirst({
            where: {
                OR: [{ cnpj }, { cnpj: cleanCnpj }],
            },
            include: {
                created_by: true,
            },
        });
    }

    private async archiveAndDeleteInaptLead(client: any, attemptedBy: User, archiveReason: string) {
        await this.prisma.$transaction(async (tx) => {
            await (tx as any).deletedLeadArchive.create({
                data: {
                    original_lead_id: client.id,
                    name: client.name,
                    surname: client.surname,
                    cnpj: client.cnpj,
                    email: client.email,
                    phone: client.phone,
                    integration_status: client.integration_status,
                    tabulacao: client.tabulacao,
                    original_owner_id: client.created_by_id,
                    original_owner_name: this.getOwnerDisplayName(client.created_by),
                    attempted_by_user_id: attemptedBy.id,
                    archive_reason: archiveReason,
                    archive_context: 'operator_pull_by_cnpj',
                    original_payload: JSON.parse(JSON.stringify(client)),
                },
            });

            await (tx as any).$executeRawUnsafe(
                'DELETE FROM "responsibility_change_requests" WHERE "lead_id" = $1',
                client.id,
            );

            await (tx as any).leadOwnerTransferAudit.deleteMany({
                where: { lead_id: client.id },
            });

            await tx.clientCustomFieldValue.deleteMany({
                where: { client_id: client.id },
            });

            await tx.deal.deleteMany({
                where: { client_id: client.id },
            });

            await tx.client.delete({
                where: { id: client.id },
            });
        });
    }

    private async executeLeadTransfer(client: any, newOwner: any, requestedBy: User, reason?: string, mode = 'operator_transfer_cnpj') {
        const oldOwnerId = client.created_by_id;

        const updatedClient = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.client.update({
                where: { id: client.id },
                data: { created_by_id: newOwner.id },
                include: { created_by: true },
            });

            await tx.deal.updateMany({
                where: { client_id: client.id, status: 'OPEN' },
                data: { responsible_id: newOwner.id },
            });

            await (tx as any).leadOwnerTransferAudit.create({
                data: {
                    lead_id: client.id,
                    old_owner_id: oldOwnerId,
                    new_owner_id: newOwner.id,
                    requested_by_user_id: requestedBy.id,
                    mode,
                    reason: reason || 'Transferência manual por CNPJ',
                },
            });

            return updated;
        });

        this.notifyN8N({
            client: updatedClient,
            oldOwner: client.created_by,
            newOwner: updatedClient.created_by,
            requestedBy,
            mode,
            reason,
            auditId: 'tx-audit',
        });

        return updatedClient;
    }

    async lookupByCnpj(cnpj: string, user: User) {
        const cleanCnpj = cnpj.replace(/\D/g, '');

        if (!cleanCnpj) {
            throw new ConflictException('CNPJ inválido');
        }

        const client = await this.prisma.client.findFirst({
            where: {
                OR: [
                    { cnpj: cnpj },
                    { cnpj: cleanCnpj }
                ]
            },
            include: {
                created_by: true
            }
        });

        if (!client) {
            throw new ConflictException('CNPJ não encontrado na base.');
        }

        // Logic for "Takeover" (Legacy) - Kept for backward compatibility if needed, 
        // but this method is now used by TakeoverModal.
        // We will ALSO implement lookupForTransfer for the new flow.

        let canTakeOver = false;
        let denyReason = '';

        if (user.role === Role.ADMIN || user.role === Role.SUPERVISOR) {
            canTakeOver = true;
        } else {
            // @ts-ignore
            if (client.last_contact_user_id === user.id) {
                canTakeOver = true;
                // @ts-ignore
            } else if (!client.last_contact_user_id) {
                denyReason = 'Você não foi o último atendente deste lead.';
            } else {
                denyReason = `Último atendente foi outro operador.`;
            }
        }

        return {
            lead_id: client.id,
            company_name: client.name,
            cnpj_masked: client.cnpj,
            owner_name: client.created_by ? `${client.created_by.name} ${client.created_by.surname || ''}`.trim() : 'Sem responsável',
            owner_id: client.created_by?.id,
            pipeline_stage: client.tabulacao || 'Sem tabulação',
            can_take_over: canTakeOver,
            deny_reason: canTakeOver ? null : denyReason
        };
    }

    async lookupForTransfer(cnpj: string, user: User) {
        const client = await this.findActiveLeadByCnpj(cnpj);

        console.log(`[LOOKUP TRANSFER] User ${user.email} searching CNPJ ${cnpj}. Found: ${!!client}`);

        if (!client) {
            return null;
        }

        const eligibility = this.isLeadEligibleForOperatorPull(client);

        return {
            lead_id: client.id,
            company_name: client.name,
            cnpj_masked: client.cnpj,
            owner_name: this.getOwnerDisplayName(client.created_by),
            owner_id: client.created_by?.id,
            pipeline_stage: client.tabulacao || 'Sem tabulacao',
            can_transfer: eligibility.eligible,
            is_eligible: eligibility.eligible,
            deny_reason: eligibility.eligible ? null : eligibility.reason,
            integration_status: client.integration_status,
            transfer_target_mode: 'requester',
            transfer_target_hint: 'Se o lead estiver apto, a responsabilidade sera assumida no momento da confirmacao.',
        };
    }

    async transferByCnpj(cnpj: string, user: User, reason?: string) {
        const client = await this.findActiveLeadByCnpj(cnpj);
        if (!client) throw new ConflictException('Lead nao encontrado.');

        const eligibility = this.isLeadEligibleForOperatorPull(client);
        if (!eligibility.eligible) {
            if (this.isLeadWaitingExternalRegistration(client)) {
                throw new ConflictException(
                    'Lead em cadastramento por outro programa. O registro sera mantido na base e podera seguir normalmente quando o processo terminar.',
                );
            }

            await this.archiveAndDeleteInaptLead(
                client,
                user,
                `${eligibility.reason} Lead excluido do fluxo operacional durante tentativa de puxar por CNPJ.`,
            );

            throw new ConflictException(
                'Lead nao apto para seguir. O registro foi removido do fluxo operacional e arquivado para consulta administrativa.',
            );
        }

        if (client.created_by_id === user.id) {
            throw new ConflictException('Voce ja e o responsavel por este lead.');
        }

        await this.executeLeadTransfer(
            client,
            user,
            user,
            reason || 'Transferencia manual por CNPJ (Novo Fluxo)',
            'operator_transfer_cnpj',
        );

        return { success: true, lead_id: client.id, message: 'Responsabilidade assumida com sucesso.' };
    }

    async takeover(id: string, user: User, reason?: string) {
        const client = await this.prisma.client.findUnique({
            where: { id },
            include: { created_by: true }
        });

        if (!client) throw new ConflictException('Lead não encontrado.');

        if (user.role === Role.OPERATOR) {
            // @ts-ignore
            if (client.last_contact_user_id !== user.id) {
                throw new ConflictException('Você não tem permissão para assumir este lead (regra do último atendente).');
            }
        }

        const oldOwnerId = client.created_by_id;
        const newOwnerId = user.id;

        if (oldOwnerId === newOwnerId) {
            throw new ConflictException('Você já é o responsável por este lead.');
        }

        if (user.role === Role.OPERATOR || user.role === Role.LEADER) {
            await this.responsibilityService.createRequest({
                leadId: id,
                toUserId: user.id,
                reason: reason || 'Solicitado via Puxar Lead (Takeover)'
            }, user);

            return { success: true, message: 'Solicitação enviada para aprovação.' };
        }

        const updatedClient = await this.prisma.client.update({
            where: { id },
            data: {
                created_by_id: newOwnerId
            },
            include: { created_by: true }
        });

        // Sincronizar Kanban (Deals abertos)
        await this.prisma.deal.updateMany({
            where: { client_id: id, status: 'OPEN' },
            data: { responsible_id: newOwnerId }
        });

        const auditId = await this.logTransferAudit(
            client.id,
            oldOwnerId,
            newOwnerId,
            user.id,
            'supervisor_single', // Operators don't reach here anymore
            reason
        );

        this.notifyN8N({
            client: updatedClient,
            oldOwner: client.created_by,
            newOwner: updatedClient.created_by,
            requestedBy: user,
            mode: 'supervisor_single',
            reason,
            auditId
        });

        return { success: true, message: 'Responsabilidade alterada com sucesso.' };
    }

    async takeoverBulk(data: { cnjp?: string, lead_id?: string, new_owner_id?: string, reason?: string }[], user: User) {
        if (user.role === Role.OPERATOR) {
            throw new ConflictException('Operadores não podem realizar ações em massa.');
        }

        const results = {
            success: 0,
            failed: 0,
            items: []
        };

        for (const item of data) {
            try {
                let client;
                if (item.lead_id) {
                    client = await this.prisma.client.findUnique({ where: { id: item.lead_id }, include: { created_by: true } });
                } else if (item.cnjp) {
                    const clean = item.cnjp.replace(/\D/g, '');
                    client = await this.prisma.client.findFirst({
                        where: { OR: [{ cnpj: item.cnjp }, { cnpj: clean }] },
                        include: { created_by: true }
                    });
                }

                if (!client) {
                    results.failed++;
                    results.items.push({ cnpj: item.cnjp, status: 'error', reason: 'Lead não encontrado' });
                    continue;
                }

                const newOwnerId = item.new_owner_id || user.id;

                if (client.created_by_id === newOwnerId) {
                    results.failed++;
                    results.items.push({ cnpj: client.cnpj, status: 'skipped', reason: 'Já pertence ao responsável' });
                    continue;
                }

                const oldOwnerId = client.created_by_id;

                const updatedClient = await this.prisma.client.update({
                    where: { id: client.id },
                    data: { created_by_id: newOwnerId },
                    include: { created_by: true }
                });

                // Sincronizar Kanban (Deals abertos)
                await this.prisma.deal.updateMany({
                    where: { client_id: client.id, status: 'OPEN' },
                    data: { responsible_id: newOwnerId }
                });

                const auditId = await this.logTransferAudit(
                    client.id,
                    oldOwnerId,
                    newOwnerId,
                    user.id,
                    'supervisor_bulk',
                    item.reason
                );

                this.notifyN8N({
                    client: updatedClient,
                    oldOwner: client.created_by,
                    newOwner: updatedClient.created_by,
                    requestedBy: user,
                    mode: 'supervisor_bulk',
                    reason: item.reason,
                    auditId
                });

                results.success++;
                results.items.push({ cnpj: client.cnpj, status: 'success', old_owner: oldOwnerId, new_owner: newOwnerId });

            } catch (err) {
                console.error('Bulk Takeover Error Item:', err);
                results.failed++;
                results.items.push({ cnpj: item.cnjp, status: 'error', reason: err.message });
            }
        }

        return results;
    }

    private async logTransferAudit(leadId: string, oldOwnerId: string, newOwnerId: string, requesterId: string, mode: string, reason?: string) {
        try {
            const audit = await (this.prisma as any).leadOwnerTransferAudit.create({
                data: {
                    lead_id: leadId,
                    old_owner_id: oldOwnerId,
                    new_owner_id: newOwnerId,
                    requested_by_user_id: requesterId,
                    mode: mode,
                    reason: reason || null
                }
            });
            return audit.id;
        } catch (e) {
            console.error('Failed to create audit log:', e);
            return null;
        }
    }

    private async notifyN8N(payload: any) {
        try {
            const webhookUrl = process.env.N8N_TAKEOVER_WEBHOOK_URL || 'https://n8n.webhook.url/replace-me';

            if (webhookUrl.includes('replace-me')) {
                // console.warn('N8N Webhook URL not configured.');
                return;
            }

            const data = {
                lead_id: payload.client.id,
                client: {
                    name: payload.client.name,
                    cnpj: payload.client.cnpj,
                    phone: payload.client.phone,
                    email: payload.client.email
                },
                old_owner: {
                    id: payload.oldOwner.id,
                    name: `${payload.oldOwner.name} ${payload.oldOwner.surname || ''}`
                },
                new_owner: {
                    id: payload.newOwner.id,
                    name: `${payload.newOwner.name} ${payload.newOwner.surname || ''}`
                },
                requested_by: {
                    id: payload.requestedBy.id,
                    name: `${payload.requestedBy.name} ${payload.requestedBy.surname || ''}`,
                    role: payload.requestedBy.role
                },
                transfer_id: payload.auditId,
                mode: payload.mode,
                reason: payload.reason,
                timestamp: new Date().toISOString()
            };

            axios.post(webhookUrl, data).catch(err => {
                console.error('N8N Webhook Failed:', err.message);
            });

        } catch (e) {
            console.error('Notify N8N Error:', e);
        }
    }

    async syncTabulationToKanban(clientId: string, newTabulation: string, actorId: string, oldTabulation?: string) {
        if (!newTabulation || newTabulation === oldTabulation) return;

        try {
            // Find active Deal for this client
            const activeDeal = await this.prisma.deal.findFirst({
                where: { client_id: clientId, status: 'OPEN' },
                orderBy: { created_at: 'desc' }
            });

            if (activeDeal) {
                // Check if this tabulation has a target stage configured in Settings > Tabulations
                const tabConfig = await this.tabulationsService.findByLabel(newTabulation);

                if (tabConfig && tabConfig.target_stage_id) {
                    if (activeDeal.stage_id !== tabConfig.target_stage_id) {
                        console.log(`[SYNC] Tabulação "${newTabulation}" moveu card para estágio ${tabConfig.target_stage_id}`);
                        await this.dealsService.update(activeDeal.id, { stage_id: tabConfig.target_stage_id } as any, actorId);
                    }
                }
            }
        } catch (e) {
            console.error("[SYNC] Erro ao sincronizar tabulação -> kanban:", e);
        }
    }
    async getDeletedLeadsArchive(query: any = {}) {
        const take = Math.min(Number(query.limit) || 100, 500);
        const search = String(query.search || '').trim();

        const where: any = {};
        if (search) {
            where.OR = [
                { name: { contains: search, mode: 'insensitive' } },
                { surname: { contains: search, mode: 'insensitive' } },
                { cnpj: { contains: search } },
                { email: { contains: search, mode: 'insensitive' } },
                { original_owner_name: { contains: search, mode: 'insensitive' } },
            ];
        }

        if (query.status === 'restored') {
            where.restored_at = { not: null };
        } else if (query.status === 'pending') {
            where.restored_at = null;
        }

        return (this.prisma as any).deletedLeadArchive.findMany({
            where,
            include: {
                attempted_by_user: {
                    select: {
                        id: true,
                        name: true,
                        surname: true,
                        email: true,
                    },
                },
            },
            orderBy: { deleted_at: 'desc' },
            take,
        });
    }

    async getDeletedLeadArchiveById(id: string) {
        const item = await (this.prisma as any).deletedLeadArchive.findUnique({
            where: { id },
            include: {
                attempted_by_user: {
                    select: { id: true, name: true, surname: true, email: true },
                },
            },
        });

        if (!item) {
            throw new ConflictException('Lead arquivado não encontrado.');
        }

        return item;
    }

    async updateDeletedLeadArchive(id: string, data: any) {
        await this.getDeletedLeadArchiveById(id);

        const allowedFields = [
            'name',
            'surname',
            'cnpj',
            'email',
            'phone',
            'integration_status',
            'tabulacao',
            'archive_reason',
        ];

        const updateData: Record<string, any> = {};
        for (const key of allowedFields) {
            if (data[key] !== undefined) {
                updateData[key] = data[key];
            }
        }

        if (Object.keys(updateData).length === 0) {
            throw new BadRequestException('Nenhum campo válido foi informado para edição.');
        }

        return (this.prisma as any).deletedLeadArchive.update({
            where: { id },
            data: updateData,
        });
    }

    private async restoreDeletedLeadArchiveInternal(archiveId: string, user: User) {
        const archive = await this.getDeletedLeadArchiveById(archiveId);
        if (archive.restored_at) {
            throw new ConflictException('Este lead arquivado já foi devolvido para a base.');
        }

        const existingClient = await this.prisma.client.findUnique({
            where: { cnpj: archive.cnpj },
        });

        if (existingClient) {
            throw new ConflictException('Já existe um lead ativo com este CNPJ na base.');
        }

        const preferredOwnerId = archive.original_owner_id || user.id;
        const owner = await this.prisma.user.findUnique({
            where: { id: preferredOwnerId },
        });

        const fallbackOwner = owner?.is_active ? owner : await this.prisma.user.findFirst({
            where: { is_active: true, role: { in: [Role.ADMIN, Role.SUPERVISOR, Role.LEADER, Role.OPERATOR] } },
            orderBy: { created_at: 'asc' },
        });

        if (!fallbackOwner) {
            throw new ConflictException('Nenhum usuário ativo disponível para restaurar o lead.');
        }

        const payload = archive.original_payload && typeof archive.original_payload === 'object'
            ? archive.original_payload
            : {};

        const restoredClient = await this.prisma.client.create({
            data: {
                name: archive.name,
                surname: archive.surname || '',
                cnpj: archive.cnpj,
                email: archive.email,
                phone: archive.phone,
                integration_status: archive.integration_status || 'Cadastro salvo com sucesso!',
                tabulacao: archive.tabulacao || payload?.tabulacao || 'Aguardando contato',
                answers: payload?.answers || {},
                is_qualified: Boolean(payload?.is_qualified),
                has_open_account: Boolean(payload?.has_open_account),
                created_by: { connect: { id: fallbackOwner.id } },
            } as any,
        });

        await this.createDefaultDeal(restoredClient, fallbackOwner.id);

        await (this.prisma as any).deletedLeadArchive.update({
            where: { id: archive.id },
            data: {
                restored_at: new Date(),
                restored_by_user_id: user.id,
                restored_client_id: restoredClient.id,
            },
        });

        return {
            archive_id: archive.id,
            restored_client_id: restoredClient.id,
            restored_client_name: restoredClient.name,
        };
    }

    async restoreDeletedLeadArchive(id: string, user: User) {
        const restored = await this.restoreDeletedLeadArchiveInternal(id, user);
        return {
            success: true,
            ...restored,
            message: 'Lead devolvido para a base com sucesso.',
        };
    }

    async restoreDeletedLeadArchiveBulk(ids: string[], user: User) {
        if (!Array.isArray(ids) || ids.length === 0) {
            throw new BadRequestException('Informe ao menos um lead arquivado para devolução.');
        }

        const results = {
            total: ids.length,
            success: 0,
            failed: 0,
            items: [] as any[],
        };

        for (const id of ids) {
            try {
                const restored = await this.restoreDeletedLeadArchiveInternal(id, user);
                results.success++;
                results.items.push({ id, status: 'success', ...restored });
            } catch (error: any) {
                results.failed++;
                results.items.push({ id, status: 'error', reason: error?.message || 'Erro ao devolver lead.' });
            }
        }

        return results;
    }

}
