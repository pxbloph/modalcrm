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
let ClientsService = class ClientsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data, user) {
        try {
            return await this.prisma.client.create({
                data: {
                    ...data,
                    answers: data['answers'] || {},
                    created_by: { connect: { id: user.id } },
                },
            });
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
    buildFilterConditions(user, query = {}) {
        const { search, startDate, endDate, responsibleId, status } = query;
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
        const client = await this.findOne(id, user);
        if (!client) {
            throw new common_1.InternalServerErrorException('Cliente não encontrado ou acesso negado');
        }
        const { faturamento_mensal, faturamento_maquina, maquininha_atual, produto_interesse, emite_boletos, deseja_receber_ofertas, informacoes_adicionais, ...clientData } = data;
        const hasQualificationInfo = faturamento_mensal !== undefined ||
            faturamento_maquina !== undefined ||
            maquininha_atual !== undefined ||
            produto_interesse !== undefined ||
            emite_boletos !== undefined ||
            deseja_receber_ofertas !== undefined ||
            informacoes_adicionais !== undefined;
        const updatedClient = await this.prisma.client.update({
            where: { id },
            data: clientData,
        });
        if (hasQualificationInfo) {
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
            }
            else {
                await this.prisma.qualification.create({
                    data: {
                        client_id: id,
                        created_by_id: user.id,
                        answers: {},
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
            const hasRealData = (maquininha_atual && maquininha_atual.trim() !== '') ||
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
        const where = this.buildFilterConditions(user, query);
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
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], ClientsService);
//# sourceMappingURL=clients.service.js.map