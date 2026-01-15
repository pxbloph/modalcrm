
import { Injectable, ConflictException, InternalServerErrorException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { User, Role, Prisma } from '@prisma/client';

@Injectable()
export class ClientsService {
    constructor(private prisma: PrismaService) { }

    async create(data: Prisma.ClientCreateInput, user: User) {
        try {
            return await this.prisma.client.create({
                data: {
                    ...data,
                    answers: data['answers'] || {},
                    // integration_status default is 'Pendente' in schema
                    created_by: { connect: { id: user.id } },
                },
            });
        } catch (error) {
            if (error.code === 'P2002') {
                const fields = error.meta?.target?.join(', ');
                throw new ConflictException(`Cliente já existe. Campo duplicado: ${fields || 'Email/CPF/Telefone'}`);
            }
            console.error('Erro ao criar cliente:', error);
            throw new InternalServerErrorException('Erro ao criar cliente no banco de dados');
        }
    }

    private buildFilterConditions(user: User, query: any = {}): Prisma.ClientWhereInput {
        const { search, startDate, endDate, responsibleId } = query;
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

        return this.prisma.client.findMany({
            where,
            include: {
                created_by: { select: { name: true, email: true } },
                qualifications: {
                    orderBy: { created_at: 'desc' },
                    take: 1,
                    // @ts-ignore
                    select: { agendamento: true }
                }
            },
            orderBy: { created_at: 'desc' }
        });
    }

    async update(id: string, data: Prisma.ClientUpdateInput, user: User) {
        const client = await this.findOne(id, user);
        if (!client) {
            throw new InternalServerErrorException('Cliente não encontrado ou acesso negado');
        }

        // Separate Client data from Qualification data
        const {
            faturamento_mensal,
            faturamento_maquina,
            maquininha_atual,
            produto_interesse,
            emite_boletos,
            deseja_receber_ofertas,
            informacoes_adicionais,
            ...clientData
        } = data as any;

        // Check if there is qualification data to update/create
        const hasQualificationInfo =
            faturamento_mensal !== undefined ||
            faturamento_maquina !== undefined ||
            maquininha_atual !== undefined ||
            produto_interesse !== undefined ||
            emite_boletos !== undefined ||
            deseja_receber_ofertas !== undefined ||
            informacoes_adicionais !== undefined;

        // Update Client Basic Info
        const updatedClient = await this.prisma.client.update({
            where: { id },
            data: clientData,
        });

        // Update/Create Qualification if data provided
        if (hasQualificationInfo) {
            // Logic: We want to update the latest qualification or create one.
            // Since qualifications are essentially historical or functional snapshots, let's create a NEW one or update the latest?
            // "Updated qualification" -> Usually means modifying the *current* state.
            // Let's UPDATE the latest if exists, otherwise create.

            const latestQual = await this.prisma.qualification.findFirst({
                where: { client_id: id },
                orderBy: { created_at: 'desc' }
            });

            if (latestQual) {
                await this.prisma.qualification.update({
                    where: { id: latestQual.id },
                    data: {
                        faturamento_mensal: faturamento_mensal ? Number(faturamento_mensal) : latestQual.faturamento_mensal,
                        faturamento_maquina: faturamento_maquina ? Number(faturamento_maquina) : latestQual.faturamento_maquina,
                        maquininha_atual: maquininha_atual ?? latestQual.maquininha_atual,
                        produto_interesse: produto_interesse ?? latestQual.produto_interesse,
                        emite_boletos: emite_boletos ?? latestQual.emite_boletos,
                        deseja_receber_ofertas: deseja_receber_ofertas ?? latestQual.deseja_receber_ofertas,
                        informacoes_adicionais: informacoes_adicionais ?? latestQual.informacoes_adicionais,
                    }
                });
            } else {
                await this.prisma.qualification.create({
                    data: {
                        client_id: id,
                        created_by_id: user.id,
                        answers: {}, // Empty for manual edits via modal
                        faturamento_mensal: faturamento_mensal ? Number(faturamento_mensal) : null,
                        faturamento_maquina: faturamento_maquina ? Number(faturamento_maquina) : null,
                        maquininha_atual: maquininha_atual || null,
                        produto_interesse: produto_interesse || null,
                        emite_boletos: !!emite_boletos,
                        deseja_receber_ofertas: !!deseja_receber_ofertas,
                        informacoes_adicionais: informacoes_adicionais || null,
                    }
                });
            }

            // Also check if we should set is_qualified = true on the client if it wasn't
            // Using the same logic as in qualifications.service if needed, or simple check
            // For now, let's just leave is_qualified as is, assuming Operator sets it explicitly or upon initial qualification flow.
            // OR: if data is present, ensure it's qualified? 
            // User Request: "Só deve mostrar a tag do qualificado, quando alguma informação for preenchida."
            // So let's re-verify that logic here too.
            const hasRealData =
                (maquininha_atual && maquininha_atual.trim() !== '') ||
                (Number(faturamento_maquina) > 0) ||
                (Number(faturamento_mensal) > 0) ||
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
                AND q.tabulacao = 'Retornar outro horário'
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
