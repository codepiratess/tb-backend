import { NestFactory } from '@nestjs/core';
import { ValidationPipe, Logger } from '@nestjs/common';
import { SwaggerModule, DocumentBuilder } from '@nestjs/swagger';
import { ConfigService } from '@nestjs/config';
import compression from 'compression';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import morgan from 'morgan';
import { WinstonModule, WINSTON_MODULE_NEST_PROVIDER } from 'nest-winston';
import * as winston from 'winston';
import { AppModule } from './app.module';
import { AllExceptionsFilter } from './common/filters/all-exceptions.filter';
import { TransformInterceptor } from './common/interceptors/transform.interceptor';
import { LoggingInterceptor } from './common/interceptors/logging.interceptor';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  // Create Winston Logger instance
  const loggerInstance = winston.createLogger({
    transports: [
      new winston.transports.Console({
        format: winston.format.combine(
          winston.format.timestamp(),
          winston.format.ms(),
          winston.format.colorize(),
          winston.format.printf(({ timestamp, level, message, context, ms }) => {
            return `[TownBolt] ${level}: ${timestamp} [${context || 'Main'}] ${message} ${ms}`;
          }),
        ),
      }),
    ],
  });

  const app = await NestFactory.create(AppModule, {
    logger: WinstonModule.createLogger({ instance: loggerInstance }),
  });

  const configService = app.get(ConfigService);
  const port = configService.get<number>('PORT') || 5000;
  const frontendUrl = configService.get<string>('FRONTEND_URL');
  const mobileAppScheme = configService.get<string>('MOBILE_APP_SCHEME');

  // Global Prefix
  app.setGlobalPrefix('api');

  // Security Headers
  app.use(helmet());

  // Compression
  app.use(compression());

  // Cookies
  app.use(cookieParser());

  // CORS
  app.enableCors({
    origin: (origin, callback) => {
      const allowedOrigins = [
        configService.get('FRONTEND_URL'),
        configService.get('FRONTEND_PROD_URL'),
        'http://localhost:3000',
        'http://localhost:3001',
        // Vercel preview URLs pattern:
        /\.vercel\.app$/,
        // Expo/React Native:
        'exp://localhost:8081',
        /exp:\/\/.*/,
        // Chrome extensions (Postman, etc.):
        /^chrome-extension:\/\/.*/,
      ];
      
      // Allow requests with no origin (mobile apps, Postman, curl)
      if (!origin) return callback(null, true);
      
      const isAllowed = allowedOrigins.some(o => 
        typeof o === 'string' 
          ? o === origin 
          : (o instanceof RegExp && o.test(origin))
      );
      
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error(`CORS: Origin ${origin} not allowed`));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: [
      'Content-Type',
      'Authorization', 
      'X-Requested-With',
      'Accept',
      'Origin',
      'X-Api-Version',
    ],
    exposedHeaders: ['X-Total-Count'],
    maxAge: 86400,
  });

  // Global Morgan for request logging
  const winstonLogger = app.get(WINSTON_MODULE_NEST_PROVIDER);
  app.use(
    morgan('combined', {
      stream: {
        write: (message) => loggerInstance.info(message.trim()),
      },
    }),
  );

  // Global Pipes
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
      transformOptions: { enableImplicitConversion: true },
    }),
  );

  // Global Filters
  app.useGlobalFilters(new AllExceptionsFilter(loggerInstance));

  // Global Interceptors
  app.useGlobalInterceptors(
    new TransformInterceptor(),
    new LoggingInterceptor(loggerInstance),
    new TimeoutInterceptor(),
  );

  // Swagger Documentation
  if (configService.get<string>('NODE_ENV') !== 'production') {
    const config = new DocumentBuilder()
      .setTitle('TownBolt API')
      .setDescription('Complete production-grade REST API backend for TownBolt E-commerce')
      .setVersion('1.0')
      .addBearerAuth()
      .addCookieAuth('refresh_token')
      .build();
    const document = SwaggerModule.createDocument(app, config);
    SwaggerModule.setup('api/docs', app, document);
  }

  await app.listen(port);
  loggerInstance.info(`🚀 Application is running on: http://localhost:${port}`);
  if (configService.get<string>('NODE_ENV') !== 'production') {
    loggerInstance.info(`📚 Swagger documentation: http://localhost:${port}/api/docs`);
  }
}
bootstrap();
