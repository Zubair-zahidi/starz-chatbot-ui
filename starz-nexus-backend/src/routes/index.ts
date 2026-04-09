import { Router } from 'express';
import mongoose from 'mongoose';
import authRoutes from './auth.routes';
import chatRoutes from './chat.routes';
import userRoutes from './user.routes';
import adminRoutes from './admin.routes';
import { ollamaService } from '../services/ollama.service';

const router = Router();

// API routes
router.use('/auth', authRoutes);
router.use('/chat', chatRoutes);
router.use('/users', userRoutes);
router.use('/admin', adminRoutes);

// Health check endpoint
router.get('/health', (req, res) => {
  // Basic DB readiness info (0=disconnected, 1=connected, 2=connecting, 3=disconnecting)
  const dbState = mongoose?.connection?.readyState ?? 0;
  const dbStateText =
    dbState === 1 ? 'connected' : dbState === 2 ? 'connecting' : dbState === 3 ? 'disconnecting' : 'disconnected';

  const host = mongoose.connection.host || null;
  const name = mongoose.connection.name || null;
  const ollama = ollamaService.getStatus();

  res.status(200).json({
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'STARZ API',
    version: process.env.APP_VERSION || '1.0.0',
    environment: process.env.NODE_ENV || 'development',
    database: { readyState: dbState, state: dbStateText, host, name },
    ai: { ollama },
  });
});

// API info endpoint
router.get('/info', (req, res) => {
  res.status(200).json({
    name: 'STARZ API',
    description: 'Enterprise Cosmic Intelligence Platform',
    version: process.env.APP_VERSION || '1.0.0',
    documentation: '/api-docs', // Add Swagger docs if implemented
    endpoints: {
      auth: '/api/auth',
      chat: '/api/chat',
      users: '/api/users',
      admin: '/api/admin',
    },
  });
});

export default router;
