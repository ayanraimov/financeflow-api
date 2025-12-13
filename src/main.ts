import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import helmet from 'helmet';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './core/exceptions';
import { setupApp } from './setup-app';

async function bootstrap() {
  const logger = new Logger('Bootstrap');
  const app = await NestFactory.create(AppModule);

  // Get ConfigService
  const configService = app.get(ConfigService);
  const port = configService.get<number>('port') ?? 3000;
  const nodeEnv = process.env.NODE_ENV || 'development';

  setupApp(app, false);

  // Global Exception Filter
  // app.useGlobalFilters(new AllExceptionsFilter());

  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: [`'self'`],
          styleSrc: [`'self'`, `'unsafe-inline'`],
          imgSrc: [`'self'`, 'data:', 'https:'],
          scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`], // Necesario para Swagger
        },
      },
      crossOriginEmbedderPolicy: false, // Necesario para Swagger
      crossOriginResourcePolicy: { policy: 'cross-origin' }, // Necesario para Swagger
    }),
  );

  app.use(
    compression({
      filter: (req, res) => {
        if (req.headers['x-no-compression']) {
          return false;
        }
        return compression.filter(req, res);
      },
      level: 6, // Nivel de compresión (0-9)
      threshold: 1024, // Solo comprimir respuestas > 1KB
    }),
  );

  app.enableCors({
    origin:
      nodeEnv === 'production'
        ? configService.get('CORS_ORIGIN')?.split(',') || [
            'https://your-domain.com',
          ]
        : '*',
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
    exposedHeaders: ['Content-Range', 'X-Content-Range'],
    maxAge: 3600, // Cache preflight por 1 hora
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
    .addTag('Analytics', 'Análisis y reportes financieros')
    .addBearerAuth()
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    customSiteTitle: 'FinanceFlow API Documentation',
    customfavIcon: 'https://nestjs.com/img/logo-small.svg',
  });

  await app.listen(port);

  logger.log(`🚀 FinanceFlow API running on: http://localhost:${port}/api/v1`);
  logger.log(`📚 Swagger Docs: http://localhost:${port}/api/docs`);
  logger.log(`🌍 Environment: ${nodeEnv}`);
  logger.log(`🔒 Security headers enabled (Helmet)`);
  logger.log(`📦 Response compression enabled (gzip)`);
  logger.log(
    `🛡️  CORS enabled for: ${nodeEnv === 'production' ? configService.get('CORS_ORIGIN') : '*'}`,
  );
  logger.log(`⚡ Rate limiting enabled (Throttler)`);
}

bootstrap();
