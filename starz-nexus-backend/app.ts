import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import rateLimit from 'express-rate-limit';
import { createServer } from 'http';
import { config } from './config';
import { connectDB } from './config/database';
import { logger, stream } from './utils/logger';
import { errorHandler, notFoundHandler } from './middleware/error.middleware';
import routes from './routes';
import { setupSocketService } from './services/socket.service';
import { ollamaService } from './services/ollama.service';

// Create Express app
const app = express();

// Create HTTP server for WebSocket
const httpServer = createServer(app);

// Security middleware
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      scriptSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "https:"],
      connectSrc: ["'self'", `ws://${config.HOST}:${config.PORT}`],
      fontSrc: ["'self'", "https:", "data:"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginEmbedderPolicy: false,
}));

// CORS configuration
app.use(cors({
  origin: config.CORS_ORIGIN,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
}));

// Rate limiting
const limiter = rateLimit({
  windowMs: config.RATE_LIMIT_WINDOW * 60 * 1000, // minutes to milliseconds
  max: config.RATE_LIMIT_MAX, // limit each IP to requests per windowMs
  message: 'Too many requests from this IP, please try again later.',
  standardHeaders: true,
  legacyHeaders: false,
});

// Apply rate limiting to API routes
app.use('/api/', limiter);

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Logging middleware
app.use(morgan(config.NODE_ENV === 'production' ? 'combined' : 'dev', { stream }));

// Request logging middleware
app.use((req, res, next) => {
  logger.debug(`${req.method} ${req.url}`, {
    body: req.body,
    query: req.query,
    params: req.params,
    user: req.user?.id,
  });
  next();
});

// API routes
app.use('/api', routes);

// Health check endpoint (without rate limiting)
app.get('/health', (req, res) => {
  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: config.APP_NAME,
    version: config.APP_VERSION,
    environment: config.NODE_ENV,
    uptime: process.uptime(),
  });
});

// 404 handler
app.use('*', notFoundHandler);

// Error handling middleware (must be last)
app.use(errorHandler);

// Initialize Socket.IO
setupSocketService(httpServer);

// Graceful shutdown
const gracefulShutdown = async () => {
  logger.info('Received shutdown signal, starting graceful shutdown...');

  // Close HTTP server
  httpServer.close(() => {
    logger.info('HTTP server closed');
  });

  // Cleanup services
  try {
    if (ollamaService.destroy) {
      ollamaService.destroy();
      logger.info('Ollama service cleaned up');
    }
  } catch (error) {
    logger.error('Error cleaning up Ollama service:', error);
  }

  // Close database connections
  try {
    await require('./config/database').disconnectDB();
    logger.info('Database connections closed');
  } catch (error) {
    logger.error('Error closing database connections:', error);
  }

  logger.info('Graceful shutdown completed');
  process.exit(0);
};

// Handle shutdown signals
process.on('SIGTERM', gracefulShutdown);
process.on('SIGINT', gracefulShutdown);

// Handle uncaught exceptions
process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Don't exit in development to allow debugging
  if (config.NODE_ENV === 'production') {
    process.exit(1);
  }
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

// Start server
const startServer = async () => {
  try {
    // Connect to database
    await connectDB();

    // Start HTTP server
    httpServer.listen(config.PORT, config.HOST, () => {
      logger.info(`🚀 ${config.APP_NAME} v${config.APP_VERSION}`);
      logger.info(`📡 Server running on http://${config.HOST}:${config.PORT}`);
      logger.info(`🌐 Environment: ${config.NODE_ENV}`);
      logger.info(`🕐 Started at: ${new Date().toISOString()}`);
      
      // Log Ollama connection status
      setTimeout(async () => {
        const isOllamaConnected = await ollamaService.checkConnection();
        if (isOllamaConnected) {
          logger.info('🤖 Ollama service connected');
        } else {
          logger.warn('⚠️ Ollama service not connected');
        }
      }, 1000);
    });

  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

// Start the server
startServer();

export { app, httpServer };