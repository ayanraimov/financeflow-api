import { INestApplication, ValidationPipe } from '@nestjs/common';
import compression from 'compression';
import helmet from 'helmet';
import { AllExceptionsFilter } from './core/exceptions';

export function setupApp(app: INestApplication, isTest = false) {
  // Global Exception Filter (solo en producción)
  if (!isTest) {
    app.useGlobalFilters(new AllExceptionsFilter());
  }

  // Helmet (solo en producción)
  if (!isTest) {
    app.use(
      helmet({
        contentSecurityPolicy: {
          directives: {
            defaultSrc: [`'self'`],
            styleSrc: [`'self'`, `'unsafe-inline'`],
            imgSrc: [`'self'`, 'data:', 'https:'],
            scriptSrc: [`'self'`, `'unsafe-inline'`, `'unsafe-eval'`],
          },
        },
        crossOriginEmbedderPolicy: false,
        crossOriginResourcePolicy: { policy: 'cross-origin' },
      }),
    );
  }

  // Compression (solo en producción)
  if (!isTest) {
    app.use(
      compression({
        filter: (req, res) => {
          if (req.headers['x-no-compression']) {
            return false;
          }
          return compression.filter(req, res);
        },
        level: 6,
        threshold: 1024,
      }),
    );
  }

  // CORS
  if (isTest) {
    app.enableCors();
  } else {
    const nodeEnv = process.env.NODE_ENV || 'development';
    app.enableCors({
      origin: nodeEnv === 'production' ? process.env.CORS_ORIGIN?.split(',') : '*',
      credentials: true,
      methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
      allowedHeaders: ['Content-Type', 'Authorization', 'Accept'],
      exposedHeaders: ['Content-Range', 'X-Content-Range'],
      maxAge: 3600,
    });
  }

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

  return app;
}
