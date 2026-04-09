import fs from 'fs';
import path from 'path';
import winston from 'winston';
import { config } from '../config';

function ensureDir(dirPath: string) {
  try {
    fs.mkdirSync(dirPath, { recursive: true });
  } catch {
    // Best-effort; if this fails the File transport will surface it.
  }
}

ensureDir(config.LOGS_PATH);

const logFormat = winston.format.combine(
  winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
  winston.format.errors({ stack: true }),
  winston.format.splat(),
  winston.format.json()
);

export const logger = winston.createLogger({
  level: config.NODE_ENV === 'production' ? 'info' : 'debug',
  format: logFormat,
  defaultMeta: { service: 'starz-nexus' },
  transports: [
    new winston.transports.File({
      filename: path.join(config.LOGS_PATH, 'error.log'),
      level: 'error',
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
    new winston.transports.File({
      filename: path.join(config.LOGS_PATH, 'combined.log'),
      maxsize: 5 * 1024 * 1024, // 5MB
      maxFiles: 5,
    }),
  ],
});

if (config.NODE_ENV !== 'production') {
  logger.add(
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      ),
    })
  );
}

// Morgan-compatible stream
export const stream = {
  write: (message: string) => logger.info(message.trim()),
};

export const logInfo = (message: string, meta?: unknown) =>
  logger.info(message, meta as any);

export const logWarn = (message: string, meta?: unknown) =>
  logger.warn(message, meta as any);

export const logDebug = (message: string, meta?: unknown) =>
  logger.debug(message, meta as any);

export const logError = (message: string, error?: unknown) =>
  logger.error(message, error as any);

