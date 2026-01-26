
import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role, Prisma } from '@prisma/client';

import { DealsService } from '../deals/deals.service';

@Injectable()
export class ClientsService {
    constructor(
        private prisma: PrismaService,
        private dealsService: DealsService
    ) { }

    async create(data: Prisma.ClientCreateInput, user: User) {
        try {
            const client = await this.prisma.client.create({
                data: {
                    ...data,
                    answers: data['answers'] || {},
                    // integration_status default is 'Pendente' in schema
                    created_by: { connect: { id: user.id } },
                },
            });

            // Auto-create Deal (Kanban)
            this.createDefaultDeal(client, user.id);

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
            const pipeline = await this.prisma.pipeline.findFirst({
                where: { is_default: true }
            });

            if (!pipeline) return;

            await this.dealsService.create({
                title: `${client.name}`,
                client_id: client.id,
                pipeline_id: pipeline.id,
                responsible_id: userId,
                priority: 'NORMAL'
            } as any);
            console.log(`Deal created for client ${client.id}`);
        } catch (e) {
            console.error("Error auto-creating deal:", e);
        }
    }

    private buildFilterConditions(user: User, query: any = {}): Prisma.ClientWhereInput {
        const { search, startDate, endDate, responsibleId, status } = query;
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

        // Date Range Filter
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

    async findAll(user: User, query: any = {}) {
        const where = this.buildFilterConditions(user, query);
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
                        // @ts-ignore
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

    async update(id: string, data: Prisma.ClientUpdateInput, user: User) {
        const client = await this.findOne(id, user);
        if (!client) {
            throw new InternalServerErrorException('Cliente não encontrado ou acesso negado');
        }

        // Check for Upsert/Merge Trigger (Lead -> Client promotion)
        const inputData = data as any;
        if (inputData.integration_status === 'Cadastro salvo com sucesso!' && inputData.cnpj) {
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

        // Update Client Basic Info
        const updatedClient = await this.prisma.client.update({
            where: { id },
            data: clientData,
        });

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
        const where = this.buildFilterConditions(user, query);



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

    async findOne(id: string, user: User) {
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
}
