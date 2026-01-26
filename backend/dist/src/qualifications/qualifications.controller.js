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
exports.QualificationsController = void 0;
const common_1 = require("@nestjs/common");
const qualifications_service_1 = require("./qualifications.service");
const passport_1 = require("@nestjs/passport");
let QualificationsController = class QualificationsController {
    constructor(qualificationsService) {
        this.qualificationsService = qualificationsService;
    }
    getTemplate() {
        return this.qualificationsService.getActiveTemplate();
    }
    getTabulations() {
        return this.qualificationsService.getTabulationOptions();
    }
    saveTemplate(body, req) {
        if (req.user.role !== 'ADMIN') {
            return { error: 'Only admin' };
        }
        return this.qualificationsService.saveTemplate(body.fields);
    }
    create(clientId, body, req) {
        return this.qualificationsService.create(clientId, body, req.user.id);
    }
    findByClient(clientId) {
        return this.qualificationsService.findByClient(clientId);
    }
};
exports.QualificationsController = QualificationsController;
__decorate([
    (0, common_1.Get)('template'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QualificationsController.prototype, "getTemplate", null);
__decorate([
    (0, common_1.Get)('tabulations'),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", []),
    __metadata("design:returntype", void 0)
], QualificationsController.prototype, "getTabulations", null);
__decorate([
    (0, common_1.Post)('template'),
    __param(0, (0, common_1.Body)()),
    __param(1, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [Object, Object]),
    __metadata("design:returntype", void 0)
], QualificationsController.prototype, "saveTemplate", null);
__decorate([
    (0, common_1.Post)(':clientId'),
    __param(0, (0, common_1.Param)('clientId')),
    __param(1, (0, common_1.Body)()),
    __param(2, (0, common_1.Request)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String, Object, Object]),
    __metadata("design:returntype", void 0)
], QualificationsController.prototype, "create", null);
__decorate([
    (0, common_1.Get)(':clientId'),
    __param(0, (0, common_1.Param)('clientId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", void 0)
], QualificationsController.prototype, "findByClient", null);
exports.QualificationsController = QualificationsController = __decorate([
    (0, common_1.Controller)('qualifications'),
    (0, common_1.UseGuards)((0, passport_1.AuthGuard)('jwt')),
    __metadata("design:paramtypes", [qualifications_service_1.QualificationsService])
], QualificationsController);
//# sourceMappingURL=qualifications.controller.js.map