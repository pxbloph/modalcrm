import { BadRequestException, Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import * as path from 'path';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DatabaseSettingsService {
    constructor(private readonly prisma: PrismaService) {}

    private getEnvPath() {
        return path.resolve(process.cwd(), '.env');
    }

    private maskDatabaseUrl(url: string | undefined | null) {
        if (!url) return '';
        try {
            const parsed = new URL(url);
            if (parsed.password) parsed.password = '***';
            return parsed.toString();
        } catch {
            return 'URL inválida';
        }
    }

    private async persistDatabaseUrl(newUrl: string) {
        const envPath = this.getEnvPath();
        let content = '';
        try {
            content = await fs.readFile(envPath, 'utf8');
        } catch {
            content = '';
        }

        const normalizedLine = `DATABASE_URL="${newUrl}"`;
        const hasLine = /^DATABASE_URL=.*$/m.test(content);
        const updated = hasLine
            ? content.replace(/^DATABASE_URL=.*$/m, normalizedLine)
            : `${content.trim()}${content.trim() ? '\n' : ''}${normalizedLine}\n`;

        await fs.writeFile(envPath, updated, 'utf8');
    }

    async getConnectionSettings() {
        const currentInfo = await this.prisma.getCurrentConnectionInfo();

        return {
            configured_database_url_masked: this.maskDatabaseUrl(process.env.DATABASE_URL),
            runtime_connection: currentInfo,
            env_path: this.getEnvPath(),
        };
    }

    async updateConnection(databaseUrl: string) {
        const sanitized = String(databaseUrl || '').trim();
        if (!sanitized) throw new BadRequestException('Informe uma DATABASE_URL válida.');

        let parsed: URL;
        try {
            parsed = new URL(sanitized);
        } catch {
            throw new BadRequestException('Formato de DATABASE_URL inválido.');
        }

        if (!['postgres:', 'postgresql:'].includes(parsed.protocol)) {
            throw new BadRequestException('Apenas conexões PostgreSQL são suportadas.');
        }

        const targetInfo = await this.prisma.testConnection(sanitized);
        await this.persistDatabaseUrl(sanitized);
        const runtimeSwitch = await this.prisma.switchDatabaseUrl(sanitized);
        const currentInfo = await this.prisma.getCurrentConnectionInfo();

        return {
            ok: true,
            target_connection: targetInfo,
            runtime_switch: runtimeSwitch,
            current_runtime_connection: currentInfo,
            configured_database_url_masked: this.maskDatabaseUrl(sanitized),
            message: runtimeSwitch.applied
                ? 'Conexão atualizada com sucesso e aplicada em runtime.'
                : 'Conexão salva no .env, mas não foi possível aplicar em runtime. Reinicie o backend para garantir a troca.',
        };
    }

    getLogs(limit = 500) {
        return {
            logs: this.prisma.getQueryLogs(limit),
            total: this.prisma.getQueryLogs(5000).length,
        };
    }
}
