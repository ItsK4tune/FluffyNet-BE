import * as dotenv from 'dotenv';
import { z } from 'zod';
dotenv.config();

export const isLocal = process.env.NODE_ENV === 'local';

const envSchema = z.object({
  NODE_ENV: z.enum(['production', 'development', 'test', 'local', 'staging']),
  PORT: z.coerce.number().default(3000),
  DNS: z.string().default('http://localhost:3000'),

  JWT_SECRET: z.string().default('Secret-string'),
  JWT_TIME: z.string().default('1h'),

  GOOGLE_CLIENT_ID: z.string(),
  GOOGLE_CLIENT_SECRET: z.string(),
  GOOGLE_CALL_BACK_URL: z.string(),

  MAIL_SENDER: z.string(),
  MAIL_APP_PASSWORD: z.string(),
  MAIL_TIME: z.string().default('1h'),

  MYSQL_URL: z.string(),

  REDIS_URL: z.string(),
  REDIS_TTL: z.string().default('1h'),

  MINIO_END_POINT: z.string().default('localhost'),
  MINIO_PORT: z.number().default(9000),
  MINIO_ACCESS_KEY: z.string(),
  MINIO_SECRET_KEY: z.string(),
  MINIO_BUCKET: z.string().default('uploads'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  throw new Error(
    `Config validation error: ${parsed.error.errors.map((e) => `${e.path}: ${e.message}`).join(', ')}`,
  );
}

const envVars = parsed.data;

export const env = {
  env: envVars.NODE_ENV,
  port: envVars.PORT,
  dns: envVars.DNS,
  jwt: {
    secret: envVars.JWT_SECRET,
    time: envVars.JWT_TIME,
  },
  google: {
    id: envVars.GOOGLE_CLIENT_ID,
    secret: envVars.GOOGLE_CLIENT_SECRET,
    url: envVars.GOOGLE_CALL_BACK_URL,
  },
  mailer: {
    sender: envVars.MAIL_SENDER,
    password: envVars.MAIL_APP_PASSWORD,
    time: envVars.MAIL_TIME,
  },
  mysql: {
    url: envVars.MYSQL_URL,
  },
  redis: {
    url: envVars.REDIS_URL,
    ttl: envVars.REDIS_TTL,
  },
  minio: {
    host: envVars.MINIO_END_POINT,
    port: envVars.MINIO_PORT,
    accessKey: envVars.MINIO_ACCESS_KEY,
    secretKey: envVars.MINIO_SECRET_KEY,
    bucket: envVars.MINIO_BUCKET,
  },
};
