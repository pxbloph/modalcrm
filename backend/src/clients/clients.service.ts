
import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role, Prisma } from '@prisma/client';

import { DealsService } from '../deals/deals.service';
import { AutomationsService } from '../automations/automations.service';
import { TabulationsService } from '../tabulations/tabulations.service';
import axios from 'axios';


@Injectable()
export class ClientsService {
    constructor(
        private prisma: PrismaService,
        private dealsService: DealsService,
        private automationsService: AutomationsService,
        private tabulationsService: TabulationsService
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

            const client = await this.prisma.client.create({
                data: {
                    ...cleanClientData,
                    // Parse date if present
                    account_opening_date: account_opening_date ? new Date(account_opening_date) : null,
                    answers: answers || {},
                    created_by: { connect: { id: finalCreatorId } },
                },
            });

            // 2. Create Initial Qualification (if any data provided)
            const qualFields = [
                faturamento_mensal, faturamento_maquina, maquininha_atual, produto_interesse,
                emite_boletos, deseja_receber_ofertas, informacoes_adicionais, tabulacao, agendamento
            ];
            const hasQualificationInfo = qualFields.some(f => f !== undefined && f !== null && f !== "");

            if (hasQualificationInfo || tabulacao) {
                // Helper to parse decimals/ints safely (reused logic)
                const toDec = (val: any) => val ? new Prisma.Decimal(val) : undefined;
                const toBool = (val: any) => val === true || val === 'true';

                await this.prisma.qualification.create({
                    data: {
                        client_id: client.id,
                        created_by_id: finalCreatorId,
                        answers: {},
                        tabulacao: tabulacao || "Aguardando contato", // Default if not provided? Or keep undefined?
                        faturamento_mensal: toDec(faturamento_mensal),
                        faturamento_maquina: toDec(faturamento_maquina),
                        maquininha_atual: maquininha_atual,
                        produto_interesse: produto_interesse,
                        emite_boletos: emite_boletos !== undefined ? toBool(emite_boletos) : false,
                        deseja_receber_ofertas: deseja_receber_ofertas !== undefined ? toBool(deseja_receber_ofertas) : false,
                        informacoes_adicionais: informacoes_adicionais,
                        agendamento: agendamento ? new Date(agendamento) : null
                    }
                });
            }

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
            let pipeline = await this.prisma.pipeline.findFirst({
                where: { is_default: true }
            });

            // Fallback: Use first available pipeline if no default is set
            if (!pipeline) {
                pipeline = await this.prisma.pipeline.findFirst({
                    orderBy: { created_at: 'asc' } // Oldest pipeline usually "Main"
                });
            }

            if (!pipeline) {
                console.warn("No pipeline found. Skipping auto-deal creation.");
                return;
            }

            await this.dealsService.create({
                title: `${client.name}`,
                client_id: client.id,
                pipeline_id: pipeline.id,
                responsible_id: userId,
                priority: 'NORMAL'
            } as any, userId); // Pass actorId explicitly to ensure proper logging
            console.log(`Deal created for client ${client.id} by actor ${userId}`);
        } catch (e) {
            console.error("Error auto-creating deal:", e);
        }
    }

    private async buildFilterConditions(user: User, query: any = {}): Promise<Prisma.ClientWhereInput> {
        const { search, startDate, endDate, responsibleId, status, tabulation, hasOpenAccount, openAccountStartDate, openAccountEndDate, pipelineId } = query;
        const andConditions: Prisma.ClientWhereInput[] = [];

        // Search Logic
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
        if (pipelineId) {
            andConditions.push({
                deals: {
                    some: {
                        pipeline_id: pipelineId
                    }
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

        // Responsible Filter
        if (responsibleId) {
            andConditions.push({ created_by_id: responsibleId });
        }

        // Date Range Filter (Creation Date)
        if (startDate || endDate) {
            const dateFilter: Prisma.DateTimeFilter = {};
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

        // Tabulation Filter (Tabulação da ÚLTIMA Qualificação)
        if (tabulation) {
            try {
                // Busca IDs de clientes onde a ÚLTIMA qualificação tem a tabulação especificada
                const clientIds = await this.prisma.$queryRaw<{ client_id: string }[]>`
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
                } else {
                    // Se nenhum ID encontrado, forçar resultado vazio
                    andConditions.push({ id: '00000000-0000-0000-0000-000000000000' });
                }
            } catch (err) {
                console.error("Erro ao filtrar por tabulação:", err);
            }
        }

        // Conta Aberta Filter (Boolean OR Date Range)
        if (openAccountStartDate || openAccountEndDate) {
            const dateFilter: Prisma.DateTimeFilter = {};
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
        } else if (hasOpenAccount === 'true' || hasOpenAccount === true) {
            // Fallback: If no dates provided, but checkbox checked -> Just check existence
            andConditions.push({ account_opening_date: { not: null } });
        }

        // RBAC Logic
        if (user.role === Role.SUPERVISOR) {
            andConditions.push({
                OR: [
                    { created_by_id: user.id },
                    { created_by: { supervisor_id: user.id } },
                ]
            });
        } else if (user.role === Role.OPERATOR) {
            andConditions.push({ created_by_id: user.id });
        }

        return andConditions.length > 0 ? { AND: andConditions } : {};
    }





    async update(id: string, data: Prisma.ClientUpdateInput, user: User) {
        try {
            console.log(`[UPDATE START] User: ${user.id} Client: ${id}`);
            const client = await this.findOne(id, user);
            if (!client) {
                console.error(`[UPDATE ERROR] Client ${id} not found or access denied`);
                throw new InternalServerErrorException('Cliente não encontrado ou acesso negado');
            }

            console.log(`[UPDATE RAW] ID: ${id}`, JSON.stringify(data)); // UNCONDITIONAL DEBUG LOG

            // Check for Upsert/Merge Trigger (Lead -> Client promotion)
            const inputData = data as any;
            if (inputData.integration_status === 'Cadastro salvo com sucesso!' && inputData.cnpj) {
                console.log(`[UPDATE CLIENT] ID: ${id}`, JSON.stringify(data)); // DEBUG LOG
                const duplicate = await this.prisma.client.findUnique({
                    where: { cnpj: inputData.cnpj }
                });

                // If a different client with same CNPJ exists, merge into it
                if (duplicate && duplicate.id !== id) {
                    console.log(`Merging Lead ${id} into existing Client ${duplicate.id} (CNPJ ${inputData.cnpj}) - Triggered by Success Status`);

                    // 1. Move qualifications from Lead to Existing Client
                    await this.prisma.qualification.updateMany({
                        where: { client_id: id },
                        data: { client_id: duplicate.id }
                    });

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

            console.log('[DEBUG] Clean Client Data:', JSON.stringify(cleanClientData));
            if (account_opening_date) console.log('[DEBUG] Opening Date:', account_opening_date);

            // Update Client Basic Info
            let updatedClient;
            try {
                updatedClient = await this.prisma.client.update({
                    where: { id },
                    data: {
                        ...cleanClientData,
                        account_opening_date: account_opening_date ? new Date(account_opening_date) : undefined
                    },
                });
            } catch (error) {
                console.error('[UPDATE ERROR] Failed to update client (Prisma):', error);
                throw error;
            }

            // Update/Create Qualification if data provided
            if (hasQualificationInfo) {
                const latestQual: any = await this.prisma.qualification.findFirst({
                    where: { client_id: id },
                    orderBy: { created_at: 'desc' }
                });

                // Helper to parse decimals/ints safely
                const toDec = (val: any) => val ? new Prisma.Decimal(val) : undefined;
                const toInt = (val: any) => val ? Number(val) : undefined;
                const toBool = (val: any) => val === true || val === 'true';

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

                    // New Fields
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
                } else {
                    await this.prisma.qualification.create({
                        data: {
                            client_id: id,
                            created_by_id: user.id,
                            answers: {},
                            ...qualDataPayload
                        }
                    });
                }

                // --- NEW: DIRECT TABULATION LOGIC (Centralized) ---
                if (tabulacao && tabulacao !== latestQual?.tabulacao) {
                    // Find active Deal for this client
                    const activeDeal = await this.prisma.deal.findFirst({
                        where: { client_id: id, status: 'OPEN' },
                        orderBy: { created_at: 'desc' }
                    });

                    if (activeDeal) {
                        // Check if this tabulation has a target stage configured in Settings > Tabulations
                        const tabConfig = await this.tabulationsService.findByLabel(tabulacao);

                        if (tabConfig && tabConfig.target_stage_id) {
                            if (activeDeal.stage_id !== tabConfig.target_stage_id) {
                                console.log(`[CLIENTS] Tabulation "${tabulacao}" dictates move to stage ${tabConfig.target_stage_id}. Moving Deal ${activeDeal.id}...`);
                                await this.dealsService.update(activeDeal.id, { stage_id: tabConfig.target_stage_id } as any, user.id);
                            }
                        }
                    }
                }
                // -----------------------------------------------------

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
            }

            return updatedClient;
        } catch (fatalError) {
            console.error('[FATAL UPDATE ERROR]', fatalError);
            throw new InternalServerErrorException('Erro grave ao atualizar cliente. Verifique os logs.');
        }
    }

    async remove(id: string, user: User) {
        if (user.role !== Role.ADMIN) {
            throw new ConflictException('Apenas admin pode excluir clientes.');
        }

        // Delete related qualifications first to avoid Foreign Key Constraint violation
        await this.prisma.qualification.deleteMany({
            where: { client_id: id }
        });

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
                qualifications: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    select: {
                        id: true,
                        tabulacao: true,
                        faturamento_mensal: true
                    }
                }
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
                qualifications: {
                    orderBy: { created_at: 'desc' },
                    take: 1
                },
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
            const qualifications: any[] = await this.prisma.$queryRaw`
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
        } catch (error) {
            console.error("Error checking notifications:", error);
            return [];
        }
    }
    async removeBulk(ids: string[], user: User) {
        if (user.role !== Role.ADMIN) {
            throw new ConflictException('Apenas admin pode excluir clientes.');
        }

        // Delete qualifications for all clients first
        await this.prisma.qualification.deleteMany({
            where: { client_id: { in: ids } }
        });

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
        const where = await this.buildFilterConditions(user, query);

        // Fetch all matching data (heavy query)
        const clients = await this.prisma.client.findMany({
            where,
            include: {
                created_by: { select: { name: true, surname: true } },
                qualifications: {
                    orderBy: { created_at: 'desc' },
                    take: 1
                }
            },
            orderBy: { created_at: 'desc' }
        });

        // Flatten Data
        const csvRows = clients.map(client => {
            const qual: any = client.qualifications[0] || {};

            return {
                'ID': client.id,
                'Razão Social': client.name,
                'Nome Sócio': client.surname || '',
                'CNPJ': client.cnpj,
                'Email': client.email,
                'Telefone': client.phone,
                'Status Integração': client.integration_status,
                'Conta Aberta': client.has_open_account ? 'SIM' : 'NÃO',
                'Data Conta Aberta': client.account_opening_date ? client.account_opening_date.toISOString().split('T')[0] : '',
                'Responsável': client.created_by ? `${client.created_by.name} ${client.created_by.surname || ''}` : '',
                'Data Criação': client.created_at.toISOString().split('T')[0],
                // Qualification Fields
                'Tabulação': qual.tabulacao || '',
                'Agendamento': qual.agendamento ? qual.agendamento.toISOString() : '',
                'Faturamento Mensal': qual.faturamento_mensal || 0,
                'Faturamento Máquina': qual.faturamento_maquina || 0,
                'Maquininha Atual': qual.maquininha_atual || '',
                'Produto Interesse': qual.produto_interesse || '',
                'Emite Boletos': qual.emite_boletos ? 'SIM' : 'NÃO',
                'Deseja Ofertas': qual.deseja_receber_ofertas ? 'SIM' : 'NÃO',
                'Informações Adicionais': qual.informacoes_adicionais || ''
            };
        });

        return csvRows;
    }

    // --- TAKEOVER FUNCTIONALITY ---

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
                created_by: { select: { id: true, name: true, surname: true } },
                qualifications: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    select: { tabulacao: true }
                }
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
            owner_name: `${client.created_by.name} ${client.created_by.surname || ''}`.trim(),
            owner_id: client.created_by.id,
            pipeline_stage: client.qualifications?.[0]?.tabulacao || 'Sem tabulação',
            can_take_over: canTakeOver,
            deny_reason: canTakeOver ? null : denyReason
        };
    }

    // NEW: Explicit lookup for Transfer (No constraints)
    async lookupForTransfer(cnpj: string, user: User) {
        const cleanCnpj = cnpj.replace(/\D/g, '');
        if (!cleanCnpj) throw new ConflictException('CNPJ inválido');

        const client = await this.prisma.client.findFirst({
            where: {
                OR: [{ cnpj: cnpj }, { cnpj: cleanCnpj }]
            },
            include: {
                created_by: { select: { id: true, name: true, surname: true } },
                qualifications: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    select: { tabulacao: true }
                }
            }
        });

        console.log(`[LOOKUP TRANSFER] User ${user.email} searching CNPJ ${cnpj}. Found: ${!!client}`);

        if (!client) {
            // Return null or throw? Throwing 404 is better for frontend handling
            return null; // Controller handles 404 or we return structured response
        }

        return {
            lead_id: client.id,
            company_name: client.name,
            cnpj_masked: client.cnpj,
            owner_name: `${client.created_by.name} ${client.created_by.surname || ''}`.trim(),
            owner_id: client.created_by.id,
            pipeline_stage: client.qualifications?.[0]?.tabulacao || 'Sem tabulação',
            can_transfer: true // Always true per new rule
        };
    }

    // NEW: Transfer By CNPJ (No constraints)
    async transferByCnpj(cnpj: string, user: User, reason?: string) {
        const cleanCnpj = cnpj.replace(/\D/g, '');

        const client = await this.prisma.client.findFirst({
            where: {
                OR: [{ cnpj: cnpj }, { cnpj: cleanCnpj }]
            },
            include: { created_by: true }
        });

        if (!client) throw new ConflictException('Lead não encontrado.');

        if (client.created_by_id === user.id) {
            throw new ConflictException('Você já é o responsável por este lead.');
        }

        const oldOwnerId = client.created_by_id;
        const newOwnerId = user.id;

        // Transaction
        const updatedClient = await this.prisma.$transaction(async (tx) => {
            const updated = await tx.client.update({
                where: { id: client.id },
                data: { created_by_id: newOwnerId },
                include: { created_by: true }
            });

            // Audit
            await (tx as any).leadOwnerTransferAudit.create({
                data: {
                    lead_id: client.id,
                    old_owner_id: oldOwnerId,
                    new_owner_id: newOwnerId,
                    requested_by_user_id: user.id,
                    mode: 'operator_transfer_cnpj',
                    reason: reason || 'Transferência manual por CNPJ (Novo Fluxo)'
                }
            });

            return updated;
        });

        // N8N Notification (Fire and forget)
        this.notifyN8N({
            client: updatedClient,
            oldOwner: client.created_by,
            newOwner: updatedClient.created_by,
            requestedBy: user,
            mode: 'operator_transfer_cnpj',
            reason,
            auditId: 'tx-audit' // simplified since inside tx we didn't return ID, acceptable
        });

        return { success: true, message: 'Responsabilidade assumida com sucesso.' };
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

        const updatedClient = await this.prisma.client.update({
            where: { id },
            data: {
                created_by_id: newOwnerId
            },
            include: { created_by: true }
        });

        const auditId = await this.logTransferAudit(
            client.id,
            oldOwnerId,
            newOwnerId,
            user.id,
            user.role === Role.OPERATOR ? 'operator_single' : 'supervisor_single',
            reason
        );

        this.notifyN8N({
            client: updatedClient,
            oldOwner: client.created_by,
            newOwner: updatedClient.created_by,
            requestedBy: user,
            mode: user.role === Role.OPERATOR ? 'operator_single' : 'supervisor_single',
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
}
