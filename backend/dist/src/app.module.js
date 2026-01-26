"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppModule = void 0;
const common_1 = require("@nestjs/common");
const config_1 = require("@nestjs/config");
const prisma_module_1 = require("./prisma/prisma.module");
const auth_module_1 = require("./auth/auth.module");
const users_module_1 = require("./users/users.module");
const clients_module_1 = require("./clients/clients.module");
const qualifications_module_1 = require("./qualifications/qualifications.module");
const teams_module_1 = require("./teams/teams.module");
const form_templates_module_1 = require("./form-templates/form-templates.module");
const reports_module_1 = require("./reports/reports.module");
const imports_module_1 = require("./imports/imports.module");
const chat_module_1 = require("./chat/chat.module");
const schedule_1 = require("@nestjs/schedule");
const pipelines_module_1 = require("./pipelines/pipelines.module");
const stages_module_1 = require("./stages/stages.module");
const custom_fields_module_1 = require("./custom-fields/custom-fields.module");
const deals_module_1 = require("./deals/deals.module");
const automations_module_1 = require("./automations/automations.module");
const tags_module_1 = require("./tags/tags.module");
let AppModule = class AppModule {
};
exports.AppModule = AppModule;
exports.AppModule = AppModule = __decorate([
    (0, common_1.Module)({
        imports: [
            config_1.ConfigModule.forRoot({
                isGlobal: true,
            }),
            prisma_module_1.PrismaModule,
            auth_module_1.AuthModule,
            users_module_1.UsersModule,
            clients_module_1.ClientsModule,
            qualifications_module_1.QualificationsModule,
            teams_module_1.TeamsModule,
            form_templates_module_1.FormTemplatesModule,
            reports_module_1.ReportsModule,
            imports_module_1.ImportsModule,
            chat_module_1.ChatModule,
            schedule_1.ScheduleModule.forRoot(),
            pipelines_module_1.PipelinesModule,
            stages_module_1.StagesModule,
            custom_fields_module_1.CustomFieldsModule,
            deals_module_1.DealsModule,
            automations_module_1.AutomationsModule,
            tags_module_1.TagsModule,
        ],
    })
], AppModule);
//# sourceMappingURL=app.module.js.map