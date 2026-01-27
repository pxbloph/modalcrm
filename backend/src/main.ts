
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import compression from 'compression';

async function bootstrap() {
    const app = await NestFactory.create(AppModule);
    app.use(compression());
    app.enableCors();
    app.setGlobalPrefix('api');
    await app.listen(process.env.PORT || 3500);
}
bootstrap();