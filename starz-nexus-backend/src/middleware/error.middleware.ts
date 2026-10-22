import { Request, Response, NextFunction } from 'express';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';
import mongoose from 'mongoose';
import { config } from '../config';

/**
 * Global error handling middleware
 */
export const errorHandler = (
  err: any,
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  let error = err;

  // Log error
  logger.error('Error:', {
    message: error.message,
    stack: error.stack,
    path: req.path,
    method: req.method,
    query: req.query,
    user: req.user?.id,
  });

  // Handle Mongoose validation errors
  if (error instanceof mongoose.Error.ValidationError) {
    const errors = Object.values(error.errors).map((err: any) => ({
      field: err.path,
      message: err.message,
      type: err.kind,
    }));
    
    error = ApiError.validationError('Validation failed', errors);
  }

  // Handle Mongoose duplicate key error
  if (error.code === 11000) {
    const field = Object.keys(error.keyPattern)[0];
    error = ApiError.conflict(`${field} already exists`);
  }

  // Handle Mongoose cast error (invalid ObjectId)
  if (error instanceof mongoose.Error.CastError) {
    error = ApiError.badRequest(`Invalid ${error.path}: ${error.value}`);
  }

  // Handle JWT errors
  if (error.name === 'JsonWebTokenError') {
    error = ApiError.unauthorized('Invalid token');
  }

  if (error.name === 'TokenExpiredError') {
    error = ApiError.unauthorized('Token expired');
  }

  // Ensure error is an ApiError
  if (!(error instanceof ApiError)) {
    // Mask internal errors in production
    const message = config.NODE_ENV === 'production' 
      ? 'Internal server error'
      : error.message;

    error = new ApiError(
      message,
      error.statusCode || 500,
      error.code || 'INTERNAL_ERROR',
      error.isOperational !== undefined ? error.isOperational : false
    );
  }

  // Send error response
  res.status(error.statusCode).json({
    success: false,
    error: {
      message: error.message,
      code: error.code,
      statusCode: error.statusCode,
      errors: error.errors,
      ...(config.NODE_ENV === 'development' && { 
        stack: error.stack,
        path: req.path,
        method: req.method,
      }),
    },
  });
};

/**
 * 404 Not Found middleware
 */
export const notFoundHandler = (
  req: Request,
  res: Response,
  next: NextFunction
): void => {
  next(ApiError.notFound(`Route ${req.method} ${req.originalUrl} not found`));
};

/**
 * Async handler wrapper to catch async errors
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};
