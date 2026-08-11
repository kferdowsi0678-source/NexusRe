import * as Joi from 'joi';

export const validationSchema = Joi.object({
  // Node Environment
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production')
    .default('development'),
  PORT: Joi.number().default(3001),

  // Database
  DB_HOST: Joi.string().required(),
  DB_PORT: Joi.number().default(5432),
  DB_USERNAME: Joi.string().required(),
  DB_PASSWORD: Joi.string().required(),
  DB_NAME: Joi.string().required(),

  // Redis
  REDIS_HOST: Joi.string().required(),
  REDIS_PORT: Joi.number().default(6379),
  REDIS_PASSWORD: Joi.string().optional().allow(''),

  // JWT
  JWT_SECRET: Joi.string().required().min(32),
  JWT_EXPIRATION: Joi.string().default('7d'),
  JWT_REFRESH_SECRET: Joi.string().required().min(32),
  JWT_REFRESH_EXPIRATION: Joi.string().default('30d'),

  // Frontend
  FRONTEND_URL: Joi.string().uri().required(),

  // AWS S3
  AWS_REGION: Joi.string().default('us-east-1'),
  AWS_ACCESS_KEY_ID: Joi.string().required(),
  AWS_SECRET_ACCESS_KEY: Joi.string().required(),
  AWS_S3_BUCKET: Joi.string().required(),

  // Email (for notifications)
  SMTP_HOST: Joi.string().optional(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().optional(),
  SMTP_PASSWORD: Joi.string().optional(),
  SMTP_FROM: Joi.string().email().optional(),

  // AI Services
  OPENAI_API_KEY: Joi.string().optional(),
  ANTHROPIC_API_KEY: Joi.string().optional(),
  AWS_TEXTRACT_REGION: Joi.string().optional(),
});
