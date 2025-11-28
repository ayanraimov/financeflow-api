import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Get ConfigService
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3000;

  // Security - Helmet
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const helmet = require('helmet');
  app.use(helmet());

  // CORS
  app.enableCors({
    origin: process.env.NODE_ENV === 'production' ? ['https://your-domain.com'] : '*',
    credentials: true,
  });

  // Global Validation Pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: {
        enableImplicitConversion: true,
      },
    }),
  );

  // API Prefix
  app.setGlobalPrefix('api/v1');

  // Swagger Documentation
  const config = new DocumentBuilder()
    .setTitle('FinanceFlow API')
    .setDescription('API para gestión de finanzas personales con IA')
    .setVersion('1.0')
    .addTag('Auth', 'Endpoints de autenticación')
    .addTag('Users', 'Gestión de usuarios')
    .addTag('Accounts', 'Cuentas bancarias')
    .addTag('Transactions', 'Transacciones')
    .addTag('Categories', 'Categorías')
    .addTag('Budgets', 'Presupuestos')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  await app.listen(port);
  console.log(`🚀 FinanceFlow API running on: http://localhost:${port}/api/v1`);
  console.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
}
bootstrap();
