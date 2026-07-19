import dotenv from 'dotenv';
import { z } from 'zod';
import path from 'path';

// Load environment variables from the monorepo root
dotenv.config({ path: path.resolve(process.cwd(), '../.env') });
dotenv.config(); // fallback to local

const envSchema = z.object({
  // Server
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),

  // Database
  DB_USER: z.string().default('postgres'),
  DB_PASSWORD: z.string().default('5196'),
  DB_HOST: z.string().default('localhost'),
  DB_PORT: z.coerce.number().default(5432),
  DB_NAME: z.string().default('aeromage'),

  // JWT
  JWT_ACCESS_SECRET: z.string().default('supersecretaccesstokenkey12345!'),
  JWT_REFRESH_SECRET: z.string().default('supersecretrefreshtokenkey67890!'),
  JWT_ACCESS_EXPIRY: z.string().default('15m'),
  JWT_REFRESH_EXPIRY: z.string().default('7d'),

  // Resend Email
  RESEND_API_KEY: z.string().default('re_123456789abcdefg'),
  EMAIL_FROM: z.string().default('Aero MAGE <onboarding@resend.dev>'),

  // System Limits & Default Operational Conditions
  MAX_CONCURRENT_SESSIONS_PER_ORG: z.coerce.number().default(10),
  MAX_QUIZZES_PER_ORG: z.coerce.number().default(100),
  MAX_QUESTIONS_PER_QUIZ: z.coerce.number().default(50),
  DEFAULT_PASSING_SCORE: z.coerce.number().default(70),
  DEFAULT_XP_QUIZ_COMPLETION: z.coerce.number().default(100),
  DEFAULT_XP_DAILY_LOGIN: z.coerce.number().default(10),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const config = parsed.data;
