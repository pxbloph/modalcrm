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
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersController = void 0;
const common_1 = require("@nestjs/common");
const users_service_1 = require("./users.service");
const passport_1 = require("@nestjs/passport");
const client_1 = require("@prisma/client");
let UsersController = class UsersController {
    constructor(usersService) {
        this.usersService = usersService;
    }
    async findAll(req) {
        if (req.user.role !== client_1.Role.ADMIN && req.user.role !== client_1.Role.SUPERVISOR) {
            throw new common_1.ForbiddenException('Apenas administradores podem listar todos os usuários');
        }
        return this.usersService.findAll(req.user);
    }
    async create(data, req) {
        if (req.user.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Apenas administradores podem criar usuários');
        }
        return this.usersService.create(data);
    }
    async findOne(id, req) {
        if (req.user.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Apenas administradores podem ver detalhes de usuários');
        }
        return this.usersService.findById(id);
    }
    async update(id, data, req) {
        if (req.user.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Apenas administradores podem editar usuários');
        }
        return this.usersService.update(id, data);
    }
    async remove(id, req) {
        if (req.user.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Apenas administradores podem excluir usuários');
        }
        try {
            return await this.usersService.remove(id, req.user.id);
        }
        catch (error) {
            throw new common_1.ForbiddenException(error.message);
        }
    }
    async removeBulk(ids, req) {
        if (req.user.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Apenas administradores podem excluir usuários');
        }
        try {
            return await this.usersService.removeBulk(ids, req.user.id);
        }
        catch (error) {
            throw new common_1.ForbiddenException(error.message);
        }
    }
    async updateStatusBulk(body, req) {
        if (req.user.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Apenas administradores podem alterar status de usuários');
        }
        try {
            return await this.usersService.updateStatusBulk(body.ids, body.isActive, req.user.id);
        }
        catch (error) {
            throw new common_1.ForbiddenException(error.message);
        }
    }
    async updateSupervisorBulk(body, req) {
        if (req.user.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Apenas administradores podem atribuir supervisores.');
        }
        try {
            return await this.usersService.updateSupervisorBulk(body.ids, body.supervisorId, req.user.id);
        }
        catch (error) {
            throw new common_1.ForbiddenException(error.message);
        }
    }
};
exports.UsersController = UsersController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findAll", null);
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "findOne", null);
__decorate([
    (0, common_1.Put)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "update", null);
__decorate([
    (0, common_1.Delete)(':id'),
    __param(0, (0, common_1.Param)('id')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "remove", null);
__decorate([
    (0, common_1.Delete)('batch/bulk-delete'),
    __param(0, (0, common_1.Body)('ids')),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Array, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "removeBulk", null);
__decorate([
    (0, common_1.Patch)('batch/bulk-status'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateStatusBulk", null);
__decorate([
    (0, common_1.Patch)('batch/bulk-supervisor'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], UsersController.prototype, "updateSupervisorBulk", null);
exports.UsersController = UsersController = __decorate([
    (0, common_1.Controller)('users'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [users_service_1.UsersService])
], UsersController);
//# sourceMappingURL=users.controller.js.map