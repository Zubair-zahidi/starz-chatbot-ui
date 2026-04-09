import mongoose from 'mongoose';
import { config } from './index';
import { logger } from '../utils/logger';

export const connectDB = async (): Promise<void> => {
  try {
    const conn = await mongoose.connect(config.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
    });

    logger.info(`MongoDB connected: ${conn.connection.host}`);
    logger.info(`Database: ${conn.connection.db.databaseName}`);

    mongoose.connection.on('error', (err) => {
      logger.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('MongoDB disconnected');
    });

    mongoose.connection.on('reconnected', () => {
      logger.info('MongoDB reconnected');
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    logger.error(`Error connecting to MongoDB: ${message}`);
    process.exit(1);
  }
};

export const disconnectDB = async (): Promise<void> => {
  try {
    await mongoose.disconnect();
    logger.info('MongoDB disconnected');
  } catch (error) {
    logger.error('Error disconnecting from MongoDB:', error);
  }
};
