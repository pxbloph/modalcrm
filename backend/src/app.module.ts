
import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { AuthModule } from './auth/auth.module';
import { UsersModule } from './users/users.module';
import { ClientsModule } from './clients/clients.module';
import { QualificationsModule } from './qualifications/qualifications.module';
import { TeamsModule } from './teams/teams.module';
import { FormTemplatesModule } from './form-templates/form-templates.module';

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
    ],
})
export class AppModule { }
