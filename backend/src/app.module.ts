
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { QualificationsModule } from './qualifications/qualifications.module';
import { TeamsModule } from './teams/teams.module';
import { FormTemplatesModule } from './form-templates/form-templates.module';
import { ReportsModule } from './reports/reports.module';
import { ImportsModule } from './imports/imports.module';
import { ChatModule } from './chat/chat.module';
import { ScheduleModule } from '@nestjs/schedule';
import { PipelinesModule } from './pipelines/pipelines.module';
import { StagesModule } from './stages/stages.module';
import { CustomFieldsModule } from './custom-fields/custom-fields.module';
import { DealsModule } from './deals/deals.module';
import { AutomationsModule } from './automations/automations.module';
import { TagsModule } from './tags/tags.module';


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
        TeamsModule,
        FormTemplatesModule,
        ReportsModule,
        ImportsModule,
        ChatModule,
        ScheduleModule.forRoot(),
        PipelinesModule,
        StagesModule,
        CustomFieldsModule,
        DealsModule,
        AutomationsModule,
        TagsModule,
    ],

})
export class AppModule { }
