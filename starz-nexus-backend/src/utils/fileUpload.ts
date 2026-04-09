import multer from 'multer';
import path from 'path';
import fs from 'fs';
import { Request } from 'express';
import { config } from '../config';
import { ApiError } from './apiError';
import { logger } from './logger';

// Ensure upload directory exists
const uploadDir = config.UPLOAD_PATH;
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  logger.info(`Created upload directory: ${uploadDir}`);
}

// Configure storage
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const userId = req.user?.id || 'anonymous';
    const userDir = path.join(uploadDir, userId);
    
    if (!fs.existsSync(userDir)) {
      fs.mkdirSync(userDir, { recursive: true });
    }
    
    cb(null, userDir);
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, file.fieldname + '-' + uniqueSuffix + extension);
  },
});

// File filter
const fileFilter = (req: any, file: any, cb: any) => {
  const allowedTypes = /jpeg|jpg|png|gif|pdf|txt/;
  const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
  const mimetype = allowedTypes.test(file.mimetype);

  if (extname && mimetype) {
    return cb(null, true);
  } else {
    cb(new ApiError('Only images (jpeg, jpg, png, gif), PDFs, and text files are allowed', 400));
  }
};

// Create multer instance
export const upload = multer({
  storage,
  limits: {
    fileSize: config.MAX_FILE_SIZE,
  },
  fileFilter,
});

// Helper to get file URL
export const getFileUrl = (req: Request, filename: string): string => {
  const userId = (req as any).user?.id || 'anonymous';
  return `/uploads/${userId}/${filename}`;
};

// Helper to delete file
export const deleteFile = async (filePath: string): Promise<void> => {
  try {
    await fs.promises.unlink(filePath);
    logger.debug(`Deleted file: ${filePath}`);
  } catch (error) {
    logger.error(`Failed to delete file ${filePath}:`, error);
  }
};

// Cleanup old files (cron job)
export const cleanupOldFiles = async (days: number = 7): Promise<void> => {
  try {
    const cutoffDate = new Date(Date.now() - days * 24 * 60 * 60 * 1000);
    
    const files = await fs.promises.readdir(uploadDir, { recursive: true });
    
    for (const file of files) {
      const filePath = path.join(uploadDir, file);
      const stats = await fs.promises.stat(filePath);
      
      if (stats.isFile() && stats.mtime < cutoffDate) {
        await deleteFile(filePath);
      }
    }
    
    logger.info(`Cleaned up old files (older than ${days} days)`);
  } catch (error) {
    logger.error('Error cleaning up old files:', error);
  }
};
