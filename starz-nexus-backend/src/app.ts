import http from 'http';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';

import { config } from './config';
import apiRoutes from './routes';
import { connectDB, disconnectDB } from './config/database';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import { logger, stream as loggerStream } from './utils/logger';
import { setupSocketService } from './services/socket.service';
import { ensureAdminUser } from './scripts/ensureAdmin';
import { ensureEncryptionKey } from './scripts/ensureEncryptionKey';

export const app = express();

// Trust proxy (needed if you deploy behind reverse proxies)
app.set('trust proxy', 1);

// Security & CORS
app.use(helmet());
app.use(
  cors({
    origin: config.CORS_ORIGIN,
    credentials: true,
  })
);

// Rate limiting (basic, per IP)
app.use(
  rateLimit({
    windowMs: config.RATE_LIMIT_WINDOW * 60 * 1000,
    max: config.RATE_LIMIT_MAX,
    standardHeaders: true,
    legacyHeaders: false,
  })
);

// Body parsing
app.use(express.json({ limit: '2mb' }));
app.use(express.urlencoded({ extended: true }));

// Static files (uploaded avatars, etc.)
app.use('/uploads', express.static(config.UPLOAD_PATH));

// HTTP request logging
app.use(morgan('combined', { stream: loggerStream }));

// Routes
app.get('/', (_req, res) => {
  res.status(200).json({
    name: config.APP_NAME,
    version: config.APP_VERSION,
    status: 'ok',
    timestamp: new Date().toISOString(),
  });
});

app.use('/api', apiRoutes);

// Errors
app.use(notFoundHandler);
app.use(errorHandler);

export const server = http.createServer(app);

// Socket.IO
setupSocketService(server);

export async function startServer(): Promise<void> {
  // Dev helper: persist a stable encryption key if encryption is enabled.
  if (config.NODE_ENV !== 'production') {
    ensureEncryptionKey();
  }

  await connectDB();

  // Dev convenience: ensure admin user exists (credentials come from env)
  if (config.NODE_ENV !== 'production') {
    await ensureAdminUser({
      email: process.env.ADMIN_EMAIL || '',
      username: process.env.ADMIN_USERNAME || 'admin',
      password: process.env.ADMIN_PASSWORD || '',
      resetPassword: process.env.ADMIN_RESET_PASSWORD === 'true',
    });
  }

  server.listen(config.PORT, config.HOST, () => {
    logger.info(
      `STARZ API listening on http://${config.HOST}:${config.PORT} (${config.NODE_ENV})`
    );
  });
}

async function shutdown(signal: string) {
  logger.info(`Received ${signal}. Shutting down...`);
  try {
    server.close(() => logger.info('HTTP server closed'));
    await disconnectDB();
    process.exit(0);
  } catch (err) {
    logger.error('Shutdown error:', err);
    process.exit(1);
  }
}

// Only auto-start when executed directly (not when imported for tests)
if (require.main === module) {
  startServer().catch((err) => {
    logger.error('Failed to start server:', err);
    process.exit(1);
  });

  process.on('SIGINT', () => shutdown('SIGINT'));
  process.on('SIGTERM', () => shutdown('SIGTERM'));
}
