import { NestFactory } from '@nestjs/core';
import { ValidationPipe, ClassSerializerInterceptor } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module';
import { FrontendAccessGuard } from './common/guards/frontend-access.guard';

async function bootstrap() {
  const app = await NestFactory.create(AppModule, {
    logger: ['error', 'warn'],
  });

  // Global validation pipe
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Global serialization interceptor
  app.useGlobalInterceptors(new ClassSerializerInterceptor(app.get(Reflector)));

  // Global frontend access guard
  app.useGlobalGuards(new FrontendAccessGuard(app.get(Reflector)));

  // CORS configuration for multiple frontends
  const configuredOrigins = [
    process.env.FRONTEND_1_URL || 'http://localhost:3000',
    process.env.FRONTEND_2_URL || 'http://localhost:3001',
    process.env.FRONTEND_3_URL || 'http://localhost:3002',
    process.env.FRONTEND_4_URL || 'http://localhost:3003',
  ].filter(Boolean); // Remove any undefined/null values
  const developmentLoopbackOrigins = process.env.NODE_ENV === 'production'
    ? []
    : [3000, 3001, 3002, 3003].flatMap(port => [
        `http://localhost:${port}`,
        `http://127.0.0.1:${port}`,
      ]);
  const allowedOrigins = new Set([...configuredOrigins, ...developmentLoopbackOrigins]);
  const storefrontRootDomain = process.env.STOREFRONT_ROOT_DOMAIN?.toLowerCase();

  console.log('Allowed CORS origins:', [...allowedOrigins]);

  app.enableCors({
    origin: function (origin, callback) {
      // Allow requests with no origin (like mobile apps, curl requests, Postman, payment gateways)
      if (!origin) return callback(null, true);
      
      if (allowedOrigins.has(origin)) {
        return callback(null, true);
      }
      if (storefrontRootDomain) {
        try {
          const url = new URL(origin);
          const hostname = url.hostname.toLowerCase();
          if (['http:', 'https:'].includes(url.protocol) && hostname.endsWith(`.${storefrontRootDomain}`)
              && hostname.slice(0, -(storefrontRootDomain.length + 1)).length > 0) return callback(null, true);
        } catch { /* rejected below */ }
      }
      return callback(new Error('Origin is not allowed by CORS'), false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
    allowedHeaders: [
      'Origin', 
      'X-Requested-With', 
      'Content-Type', 
      'Accept', 
      'Authorization', 
      'X-Frontend-Type',
      'X-API-Version',
      'Idempotency-Key'
    ],
  });

  // Swagger documentation
  const config = new DocumentBuilder()
    .setTitle('Inventory POS API')
    .setDescription('The Inventory POS API documentation')
    .setVersion('1.0')
    .addBearerAuth()
    .addTag('Authentication', 'Authentication endpoints')
    .addTag('Subscription', 'Subscription management endpoints')
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document, {
    swaggerOptions: {
      persistAuthorization: true,
    },
  });

  const port = process.env.PORT || 5000;
  await app.listen(port);
  
  console.log(`Application is running on: http://localhost:${port}`);
  console.log(`Swagger documentation: http://localhost:${port}/api/docs`);
}
bootstrap();
