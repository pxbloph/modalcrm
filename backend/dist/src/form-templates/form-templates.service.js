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
exports.FormTemplatesService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
let FormTemplatesService = class FormTemplatesService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async create(data) {
        await this.prisma.formTemplate.updateMany({
            where: { type: data.type, is_active: true },
            data: { is_active: false }
        });
        return this.prisma.formTemplate.create({
            data: {
                title: data.title,
                fields: data.fields,
                type: data.type,
                is_active: true
            }
        });
    }
    async findActive(type = 'QUALIFICATION') {
        return this.prisma.formTemplate.findFirst({
            where: { is_active: true, type },
            orderBy: { created_at: 'desc' }
        });
    }
    async findAll() {
        return this.prisma.formTemplate.findMany({
            orderBy: { created_at: 'desc' }
        });
    }
};
exports.FormTemplatesService = FormTemplatesService;
exports.FormTemplatesService = FormTemplatesService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], FormTemplatesService);
//# sourceMappingURL=form-templates.service.js.map