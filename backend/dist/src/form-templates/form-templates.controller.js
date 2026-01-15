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
exports.FormTemplatesController = void 0;
const common_1 = require("@nestjs/common");
const form_templates_service_1 = require("./form-templates.service");
const passport_1 = require("@nestjs/passport");
const client_1 = require("@prisma/client");
let FormTemplatesController = class FormTemplatesController {
    constructor(formTemplatesService) {
        this.formTemplatesService = formTemplatesService;
    }
    async create(data, req) {
        if (req.user.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Apenas administradores podem criar modelos de formulário');
        }
        return this.formTemplatesService.create(data);
    }
    async findActive(req) {
        const type = req.query.type || 'QUALIFICATION';
        return this.formTemplatesService.findActive(type);
    }
    async findAll(req) {
        if (req.user.role !== client_1.Role.ADMIN) {
            throw new common_1.ForbiddenException('Apenas administradores podem ver histórico de formulários');
        }
        return this.formTemplatesService.findAll();
    }
};
exports.FormTemplatesController = FormTemplatesController;
__decorate([
    (0, common_1.Post)(),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", Promise)
], FormTemplatesController.prototype, "create", null);
__decorate([
    (0, common_1.Get)('active'),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FormTemplatesController.prototype, "findActive", null);
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object]),
    __metadata("design:returntype", Promise)
], FormTemplatesController.prototype, "findAll", null);
exports.FormTemplatesController = FormTemplatesController = __decorate([
    (0, common_1.Controller)('form-templates'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [form_templates_service_1.FormTemplatesService])
], FormTemplatesController);
//# sourceMappingURL=form-templates.controller.js.map