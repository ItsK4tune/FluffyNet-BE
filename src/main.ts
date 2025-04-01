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

interface AuthenticatedUser {
  user_id: number;
  email: string;
  role: string; 
  jit: string; 
}

declare global {
  namespace Express {
    interface User {
      user_id: number;
      email: string;
      role: string;
      jit: string;
    }
  }
}

const setMiddleware = (app: NestExpressApplication) => {
  const allowedOriginsEnv = env.cors;
  const allowedOrigins = allowedOriginsEnv
                         .split(',') 
                         .map(origin => origin.trim()) 
                         .filter(origin => origin.length > 0);

  app.enableCors({
    credentials: true,
    origin: (origin, callback) => {
      console.log(`[CORS Check] Received Origin Header: ${origin}`);
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
      } else {
        console.error(`CORS Error: Origin ${origin} not allowed.`); 
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
      limit: 10, 
      message: 'Too many requests from this source, please try again later.',
      standardHeaders: 'draft-7',
	    legacyHeaders: false, 

      keyGenerator: (req: Request): string => {
        if (req.user && req.user.user_id) {
          return `user:${req.user.user_id}`;
        } else {
          return `ip:${req.ip}`;
        }
     },
    })
  );

  app.use(morgan('combined'));

  app.use(compression());

  app.use(cookieParser());

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
      jsonDocumentUrl: 'swagger/json',
    });
  }

  await app.listen(env.port, () =>
    logger.warn(`> Listening on port ${env.port}`),
  );
}

bootstrap();
