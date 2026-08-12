import * as Joi from 'joi';

/**
 * Environment contract for the backend. Anything `required()` here will stop the
 * process from booting when missing, which is deliberate: a half-configured
 * deployment is worse than one that refuses to start.
 *
 * Optional groups (SMTP, AI providers) degrade gracefully at runtime — the
 * services that use them log and no-op instead of throwing.
 */
export const validationSchema = Joi.object({
  // Node Environment
  NODE_ENV: Joi.string()
    .valid('development', 'staging', 'production', 'test')
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

  // Rate limiting
  THROTTLE_TTL: Joi.number().default(60),
  THROTTLE_LIMIT: Joi.number().default(100),

  // Email — optional. Without SMTP_HOST the email service logs instead of sending.
  SMTP_HOST: Joi.string().optional().allow(''),
  SMTP_PORT: Joi.number().default(587),
  SMTP_SECURE: Joi.boolean().default(false),
  SMTP_USER: Joi.string().optional().allow(''),
  SMTP_PASS: Joi.string().optional().allow(''),
  EMAIL_FROM: Joi.string().email().default('noreply@nexusre.com'),
  EMAIL_FROM_NAME: Joi.string().default('NexusRe'),

  // AI services — optional. Without a key, extraction and AI matching fall back
  // to deterministic heuristics rather than failing.
  ANTHROPIC_API_KEY: Joi.string().optional().allow(''),
  ANTHROPIC_MODEL: Joi.string().default('claude-sonnet-4-5'),
  AWS_TEXTRACT_REGION: Joi.string().optional().allow(''),
  AI_EXTRACTION_ENABLED: Joi.boolean().default(true),
});
