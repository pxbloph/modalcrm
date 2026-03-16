import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { Client, ConnectConfig } from 'ssh2';

@Injectable()
export class VpsTerminalService {
    private getEnabled() {
        return String(process.env.VPS_TERMINAL_ENABLED || 'false').toLowerCase() === 'true';
    }

    private buildConfig(): ConnectConfig {
        const host = process.env.VPS_SSH_HOST;
        const username = process.env.VPS_SSH_USERNAME;
        const port = Number(process.env.VPS_SSH_PORT || 22);
        const password = process.env.VPS_SSH_PASSWORD;
        const privateKeyRaw = process.env.VPS_SSH_PRIVATE_KEY;
        const passphrase = process.env.VPS_SSH_PASSPHRASE;

        if (!host || !username) {
            throw new BadRequestException('Configure VPS_SSH_HOST e VPS_SSH_USERNAME no backend/.env.');
        }

        const privateKey = privateKeyRaw
            ? (privateKeyRaw.includes('BEGIN') ? privateKeyRaw.replace(/\\n/g, '\n') : Buffer.from(privateKeyRaw, 'base64').toString('utf8'))
            : undefined;

        if (!password && !privateKey) {
            throw new BadRequestException('Configure VPS_SSH_PASSWORD ou VPS_SSH_PRIVATE_KEY no backend/.env.');
        }

        return {
            host,
            port,
            username,
            password,
            privateKey,
            passphrase,
            readyTimeout: 15000,
            keepaliveInterval: 10000,
        };
    }

    private connectSsh(config: ConnectConfig): Promise<Client> {
        return new Promise((resolve, reject) => {
            const client = new Client();
            client
                .on('ready', () => resolve(client))
                .on('error', (error) => reject(error))
                .connect(config);
        });
    }

    getStatus() {
        const enabled = this.getEnabled();
        return {
            enabled,
            host: process.env.VPS_SSH_HOST || null,
            port: Number(process.env.VPS_SSH_PORT || 22),
            username: process.env.VPS_SSH_USERNAME || null,
            auth_mode: process.env.VPS_SSH_PRIVATE_KEY ? 'private_key' : 'password',
        };
    }

    async testConnection() {
        if (!this.getEnabled()) {
            throw new ForbiddenException('Terminal da VPS está desabilitado. Defina VPS_TERMINAL_ENABLED=true para habilitar.');
        }

        const config = this.buildConfig();
        const client = await this.connectSsh(config);
        client.end();

        return { ok: true, message: 'Conexão com a VPS validada com sucesso.' };
    }

    async execute(command: string, timeoutMs = 30000) {
        if (!this.getEnabled()) {
            throw new ForbiddenException('Terminal da VPS está desabilitado. Defina VPS_TERMINAL_ENABLED=true para habilitar.');
        }

        const sanitizedCommand = String(command || '').trim();
        if (!sanitizedCommand) {
            throw new BadRequestException('Informe um comando para executar.');
        }
        if (sanitizedCommand.length > 1500) {
            throw new BadRequestException('Comando muito longo. Limite: 1500 caracteres.');
        }

        const config = this.buildConfig();
        const client = await this.connectSsh(config);

        return await new Promise((resolve, reject) => {
            let stdout = '';
            let stderr = '';
            let exitCode: number | null = null;
            const startedAt = Date.now();
            const safeTimeout = Math.max(5000, Math.min(120000, Number(timeoutMs) || 30000));

            const timer = setTimeout(() => {
                client.end();
                reject(new BadRequestException(`Comando excedeu tempo limite de ${safeTimeout}ms.`));
            }, safeTimeout);

            client.exec(sanitizedCommand, (error, stream) => {
                if (error) {
                    clearTimeout(timer);
                    client.end();
                    reject(error);
                    return;
                }

                stream.on('data', (chunk: Buffer | string) => {
                    stdout += chunk.toString();
                });

                stream.stderr.on('data', (chunk: Buffer | string) => {
                    stderr += chunk.toString();
                });

                stream.on('close', (code: number | null) => {
                    exitCode = code;
                    clearTimeout(timer);
                    client.end();
                    resolve({
                        ok: code === 0,
                        command: sanitizedCommand,
                        stdout,
                        stderr,
                        exit_code: exitCode,
                        duration_ms: Date.now() - startedAt,
                    });
                });
            });
        });
    }
}
