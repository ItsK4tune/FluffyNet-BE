import { ValidationPipe, Logger } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import rateLimit from 'express-rate-limit';
import * as compression from 'compression';
import * as cookieParser from 'cookie-parser';
import helmet from 'helmet';
import * as morgan from 'morgan';
import { Request } from 'express';

import { env } from './config';
import { AppModule } from './modules/app.module';

const REFRESH_COOKIE_NAME = 'jid';

const setMiddleware = (app: NestExpressApplication) => {
  const allowedOriginsEnv = env.cors;
  const allowedOrigins = allowedOriginsEnv
                         .split(',') 
                         .map(origin => origin.trim()) 
                         .filter(origin => origin.length > 0);

  app.use(cookieParser());

  app.enableCors({
    credentials: true,
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        callback(new Error(`Origin ${origin} not allowed by CORS`));
      }
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS', 'HEAD'],
    allowedHeaders: [
      'Content-Type',
      'Authorization', 
      'Accept',
      'Origin', 
    ],
    preflightContinue: false, 
    optionsSuccessStatus: 204 
  });

  app.use(helmet());

  app.use(
    rateLimit({
      windowMs: 60 * 1000, 
      limit: 100, 
      message: 'Too many requests from this source, please try again later.',
      standardHeaders: 'draft-7',
	    legacyHeaders: false, 

      keyGenerator: (req: Request): string => {
        const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
        if (refreshToken) {
          return `rt:${refreshToken}`;
        } else {
          return `ip:${req.ip}`;
        }
      },
    })
  );

  app.use(morgan('combined'));

  app.use(compression());

  app.useGlobalPipes(
    new ValidationPipe({
      transform: true,
      whitelist: true,
    }),
  );
};

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, {
    logger: new Logger('[]'),
  });
  app.useLogger(new Logger('APP'));
  const logger = new Logger('APP');

  app.set('trust proxy', 1);
  
  app.setGlobalPrefix('api');
  setMiddleware(app);

  if (process.env.NODE_ENV !== 'production') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Fluffy Net')
      .setDescription('API documentation for Fluffy Net backend')
      .setVersion('alpha')
      .addBearerAuth()
      .build();

    const swaggerDocument = SwaggerModule.createDocument(app, swaggerConfig);
    SwaggerModule.setup('swagger', app, swaggerDocument, {
      explorer: true,
      customSiteTitle: 'Fluffy Net API Docs',
      swaggerOptions: {
        docExpansion: 'none',
        defaultModelsExpandDepth: -1,
        filter: true,
        url: `/api/swagger-json?v=${Date.now()}`,
      },  
      jsonDocumentUrl: 'swagger/json',
    });
  }

  
  await app.listen(env.port, () =>
    logger.warn(`> Listening on port ${env.port}`),
  );
}

bootstrap();
