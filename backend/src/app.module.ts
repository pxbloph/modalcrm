
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { QualificationsModule } from './qualifications/qualifications.module';

import { FormTemplatesModule } from './form-templates/form-templates.module';
import { ReportsModule } from './reports/reports.module';
import { ImportsModule } from './imports/imports.module';
import { ChatModule } from './chat/chat.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PipelinesModule } from './pipelines/pipelines.module';
import { TabulationsModule } from './tabulations/tabulations.module';
import { StagesModule } from './stages/stages.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { DealsModule } from './deals/deals.module';
import { AutomationsModule } from './automations/automations.module';
import { TagsModule } from './tags/tags.module';
import { ClientCustomFieldsModule } from './client-custom-fields/client-custom-fields.module';
import { DashboardsModule } from './dashboards/dashboards.module';
import { ServeStaticModule } from '@nestjs/serve-static';
import { join } from 'path';



@Module({
    imports: [
        ConfigModule.forRoot({
            isGlobal: true,
        }),
        PrismaModule,
        AuthModule,
        UsersModule,
        ClientsModule,
        QualificationsModule,
        FormTemplatesModule,
        ReportsModule,
        ImportsModule,
        ChatModule,
        ScheduleModule.forRoot(),
        PipelinesModule,
        PipelinesModule,
        TabulationsModule,
        StagesModule,
        CustomFieldsModule,
        DealsModule,
        AutomationsModule,
        TagsModule,
        ClientCustomFieldsModule,
        DashboardsModule,
        ServeStaticModule.forRoot({
            rootPath: join(__dirname, '..', 'uploads'),
            serveRoot: '/api/uploads',
        }),

    ],

})
export class AppModule { }
