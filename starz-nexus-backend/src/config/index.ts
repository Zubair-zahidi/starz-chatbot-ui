import dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config();

export const config = {
  // Server
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: parseInt(process.env.PORT || '3001'),
  HOST: process.env.HOST || 'localhost',
  
  // Database
  MONGODB_URI: process.env.MONGODB_URI || 'mongodb://localhost:27017/starz-nexus',
  
  // Redis
  REDIS_URL: process.env.REDIS_URL || 'redis://localhost:6379',
  
  // Ollama
  OLLAMA_URL: process.env.OLLAMA_URL || 'http://localhost:11434',
  OLLAMA_MODEL: process.env.OLLAMA_MODEL || 'llama3',
  OLLAMA_TIMEOUT: parseInt(process.env.OLLAMA_TIMEOUT || '30000'),
  
  // JWT
  JWT_SECRET: process.env.JWT_SECRET || 'your-super-secret-jwt-key',
  JWT_EXPIRE: process.env.JWT_EXPIRE || '15m',
  JWT_REFRESH_EXPIRE: process.env.JWT_REFRESH_EXPIRE || '7d',
  REQUIRE_EMAIL_VERIFICATION:
    process.env.REQUIRE_EMAIL_VERIFICATION === 'true' ||
    (process.env.NODE_ENV === 'production' &&
      process.env.REQUIRE_EMAIL_VERIFICATION !== 'false'),

  // Admin (dev tooling)
  // Optional: allows admin requests via `x-admin-key` header (useful for Thunder Client).
  // Recommended for local/dev only.
  ADMIN_API_KEY: process.env.ADMIN_API_KEY || '',
  ALLOW_ADMIN_API_KEY:
    process.env.ALLOW_ADMIN_API_KEY === 'true' ||
    (process.env.NODE_ENV !== 'production' && process.env.ADMIN_API_KEY ? true : false),
  // Extremely insecure dev toggle: allow admin-only routes without any auth when requests come from localhost.
  // DO NOT ENABLE IN PRODUCTION.
  ALLOW_INSECURE_LOCAL_ADMIN_NO_AUTH:
    process.env.ALLOW_INSECURE_LOCAL_ADMIN_NO_AUTH === 'true' &&
    process.env.NODE_ENV !== 'production',
  
  // Security
  CORS_ORIGIN: process.env.CORS_ORIGIN?.split(',') || [
    'http://localhost:3000',
    'http://localhost:4173',
    'http://localhost:5173',
    'http://127.0.0.1:3000',
    'http://127.0.0.1:4173',
    'http://127.0.0.1:5173',
  ],
  RATE_LIMIT_WINDOW: parseInt(process.env.RATE_LIMIT_WINDOW || '15'),
  RATE_LIMIT_MAX: parseInt(process.env.RATE_LIMIT_MAX || '100'),

  // Data Encryption (application-level, optional)
  ENABLE_MESSAGE_ENCRYPTION: process.env.ENABLE_MESSAGE_ENCRYPTION === 'true',
  // 32-byte key required for AES-256-GCM. Provide as base64.
  DATA_ENCRYPTION_KEY: process.env.DATA_ENCRYPTION_KEY || '',
  
  // File Upload
  MAX_FILE_SIZE: parseInt(process.env.MAX_FILE_SIZE || '10485760'),
  UPLOAD_PATH: process.env.UPLOAD_PATH || path.join(__dirname, '../../uploads'),
  
  // Email
  SMTP_HOST: process.env.SMTP_HOST,
  SMTP_PORT: parseInt(process.env.SMTP_PORT || '587'),
  SMTP_USER: process.env.SMTP_USER,
  SMTP_PASS: process.env.SMTP_PASS,
  
  // External APIs
  NASA_API_KEY: process.env.NASA_API_KEY,
  SIMBAD_API_URL: process.env.SIMBAD_API_URL || 'http://simbad.u-strasbg.fr/simbad/sim-id',
  
  // App Info
  APP_NAME: process.env.APP_NAME || 'STARZ',
  APP_VERSION: process.env.APP_VERSION || '1.0.0',
  
  // Paths
  LOGS_PATH: path.join(__dirname, '../../logs'),
};
