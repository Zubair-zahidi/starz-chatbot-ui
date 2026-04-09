import { Request, Response, NextFunction } from 'express';
import { User, ChatSession, Message } from '../models';
import { ollamaService } from '../services/ollama.service';
import { getSocketService } from '../services/socket.service';
import { ApiResponse } from '../utils/response';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import fs from 'fs/promises';
import path from 'path';
import { config } from '../config';

const safeGetSocketService = () => {
  try {
    return getSocketService();
  } catch {
    return null;
  }
};

/**
 * Get system statistics
 */
export const getSystemStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const [
      totalUsers,
      totalSessions,
      totalMessages,
      activeUsersToday,
      messagesToday,
      ollamaStatus,
      socketStats,
    ] = await Promise.all([
      User.countDocuments(),
      ChatSession.countDocuments(),
      Message.countDocuments(),
      User.countDocuments({
        lastLogin: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }),
      Message.countDocuments({
        createdAt: {
          $gte: new Date(Date.now() - 24 * 60 * 60 * 1000)
        }
      }),
      ollamaService.getStatus(),
      safeGetSocketService()?.getStatus?.() || { connectedUsers: 0, activeSessions: 0 },
    ]);

    const stats = {
      users: {
        total: totalUsers,
        activeToday: activeUsersToday,
        byRole: {
          user: await User.countDocuments({ role: 'user' }),
          researcher: await User.countDocuments({ role: 'researcher' }),
          admin: await User.countDocuments({ role: 'admin' }),
        },
        bySubscription: {
          free: await User.countDocuments({ subscription: 'free' }),
          pro: await User.countDocuments({ subscription: 'pro' }),
          enterprise: await User.countDocuments({ subscription: 'enterprise' }),
        },
      },
      chat: {
        totalSessions,
        totalMessages,
        messagesToday,
        averageMessagesPerSession: totalSessions > 0 ? totalMessages / totalSessions : 0,
      },
      system: {
        uptime: process.uptime(),
        memory: process.memoryUsage(),
        environment: config.NODE_ENV,
        ollama: ollamaStatus,
        websocket: socketStats,
        database: 'connected', // Would check MongoDB connection
        redis: 'connected', // Would check Redis connection
      },
    };

    ApiResponse.success(res, stats, 'System statistics retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get Ollama service status
 */
export const getOllamaStatus = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const status = ollamaService.getStatus();
    const models = await ollamaService.listModels();

    ApiResponse.success(res, {
      status,
      models,
    }, 'Ollama status retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Get active WebSocket connections
 */
export const getActiveConnections = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const stats = safeGetSocketService()?.getStatus?.() || { 
      connectedUsers: 0, 
      activeSessions: 0 
    };

    ApiResponse.success(res, stats, 'Active connections retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Cleanup old messages (older than 30 days)
 */
export const cleanupOldMessages = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { days = 30 } = req.body;
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    // Delete messages older than cutoff date
    const result = await Message.deleteMany({
      createdAt: { $lt: cutoffDate },
      isDeleted: true, // Only delete already soft-deleted messages
    });

    logger.info(`Cleaned up ${result.deletedCount} messages older than ${days} days`);

    ApiResponse.success(res, {
      deletedCount: result.deletedCount,
      cutoffDate,
    }, `Cleaned up ${result.deletedCount} old messages`);
  } catch (error) {
    next(error);
  }
};

/**
 * Backup database (simplified version)
 */
export const backupDatabase = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const backupDir = path.join(__dirname, '../../backups');
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupFile = path.join(backupDir, `backup-${timestamp}.json`);

    // Create backup directory if it doesn't exist
    await fs.mkdir(backupDir, { recursive: true });

    // Collect all data (simplified - in production use mongodump)
    const backupData = {
      timestamp: new Date().toISOString(),
      collections: {
        users: await User.find().lean(),
        chatSessions: await ChatSession.find().lean(),
        messages: await Message.find().lean(),
      },
    };

    // Write backup to file
    await fs.writeFile(backupFile, JSON.stringify(backupData, null, 2));

    logger.info(`Database backup created: ${backupFile}`);

    ApiResponse.success(res, {
      backupFile: path.basename(backupFile),
      size: (await fs.stat(backupFile)).size,
      timestamp: backupData.timestamp,
    }, 'Database backup created successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Toggle maintenance mode
 */
export const toggleMaintenance = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { enabled, message } = req.body;
    
    // In production, this would update a database flag or use Redis
    // For now, we'll just log it
    if (enabled) {
      logger.warn(`Maintenance mode enabled: ${message || 'System maintenance in progress'}`);
      // Notify all connected clients via WebSocket
      safeGetSocketService()?.emitToAll?.('maintenance', {
        enabled: true,
        message: message || 'System maintenance in progress',
        estimatedDuration: '30 minutes',
      });
    } else {
      logger.info('Maintenance mode disabled');
      safeGetSocketService()?.emitToAll?.('maintenance', { enabled: false });
    }

    ApiResponse.success(res, {
      maintenanceMode: enabled,
      message: enabled ? 'Maintenance mode enabled' : 'Maintenance mode disabled',
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get system logs (last 100 lines)
 */
export const getLogs = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { lines = 100, type = 'combined' } = req.query;
    const logFile = path.join(config.LOGS_PATH, `${type}.log`);
    
    try {
      await fs.access(logFile);
    } catch {
      throw ApiError.notFound('Log file not found');
    }

    // Read log file
    const logContent = await fs.readFile(logFile, 'utf-8');
    const logLines = logContent.split('\n').filter(line => line.trim());
    const lastLines = logLines.slice(-Number(lines));

    ApiResponse.success(res, {
      lines: lastLines,
      totalLines: logLines.length,
      file: path.basename(logFile),
    }, 'Logs retrieved successfully');
  } catch (error) {
    next(error);
  }
};
