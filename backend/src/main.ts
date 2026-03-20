import { webcrypto } from 'crypto';
// @ts-ignore
if (!globalThis.crypto) globalThis.crypto = webcrypto;

import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import compression from 'compression';

async function bootstrap() {
    process.env.TZ = 'America/Sao_Paulo';
    const app = await NestFactory.create(AppModule);
    app.use(compression());
    app.enableCors();
    app.setGlobalPrefix('api');
    await app.listen(process.env.PORT || 3500, '0.0.0.0');
}
bootstrap();
