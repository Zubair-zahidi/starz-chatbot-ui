import { Request, Response, NextFunction } from 'express';
import Joi from 'joi';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

// Custom validation messages
const validationMessages = {
  'string.base': '"{#label}" must be a string',
  'string.empty': '"{#label}" cannot be empty',
  'string.min': '"{#label}" must be at least {#limit} characters',
  'string.max': '"{#label}" cannot exceed {#limit} characters',
  'string.email': '"{#label}" must be a valid email',
  'string.pattern.base': '"{#label}" must contain only letters, numbers, and underscores',
  'number.base': '"{#label}" must be a number',
  'number.min': '"{#label}" must be at least {#limit}',
  'number.max': '"{#label}" cannot exceed {#limit}',
  'boolean.base': '"{#label}" must be a boolean',
  'array.base': '"{#label}" must be an array',
  'any.required': '"{#label}" is required',
  'any.only': '"{#label}" must be one of {#valids}',
};

/**
 * Validation middleware factory
 */
export const validate = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      // Validate request
      const { error, value } = schema.validate(req.body, {
        abortEarly: false,
        messages: validationMessages,
        stripUnknown: true,
      });

      if (error) {
        // Format validation errors
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        logger.debug('Validation failed:', { errors, body: req.body });
        
        throw ApiError.validationError('Validation failed', errors);
      }

      // Replace request body with validated values
      req.body = value;
      
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate query parameters
 */
export const validateQuery = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.query, {
        abortEarly: false,
        messages: validationMessages,
        stripUnknown: true,
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        throw ApiError.validationError('Query validation failed', errors);
      }

      req.query = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

/**
 * Validate URL parameters
 */
export const validateParams = (schema: Joi.ObjectSchema) => {
  return (req: Request, res: Response, next: NextFunction) => {
    try {
      const { error, value } = schema.validate(req.params, {
        abortEarly: false,
        messages: validationMessages,
      });

      if (error) {
        const errors = error.details.map(detail => ({
          field: detail.path.join('.'),
          message: detail.message,
          type: detail.type,
        }));

        throw ApiError.validationError('Parameter validation failed', errors);
      }

      req.params = value;
      next();
    } catch (error) {
      next(error);
    }
  };
};

// Common validation schemas
export const validationSchemas = {
  // Auth schemas
  register: Joi.object({
    email: Joi.string().email().required(),
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_]+$/)
      .required(),
    password: Joi.string().min(8).required(),
  }),

  login: Joi.object({
    email: Joi.string().email().required(),
    password: Joi.string().required(),
  }),

  refreshToken: Joi.object({
    refreshToken: Joi.string().required(),
  }),

  forgotPassword: Joi.object({
    email: Joi.string().email().required(),
  }),

  resetPassword: Joi.object({
    token: Joi.string().required(),
    password: Joi.string().min(8).required(),
  }),

  changePassword: Joi.object({
    currentPassword: Joi.string().required(),
    newPassword: Joi.string().min(8).required(),
  }),

  updateProfile: Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_]+$/),
    avatar: Joi.string().uri(),
    settings: Joi.object({
      theme: Joi.string().valid('dark', 'light', 'cosmic'),
      notifications: Joi.boolean(),
      dataRefresh: Joi.number().min(5).max(300),
      language: Joi.string().valid('en', 'es', 'fr', 'de'),
    }),
  }),

  adminUpdateUser: Joi.object({
    username: Joi.string()
      .min(3)
      .max(30)
      .pattern(/^[a-zA-Z0-9_]+$/),
    avatar: Joi.string().uri(),
    settings: Joi.object({
      theme: Joi.string().valid('dark', 'light', 'cosmic'),
      notifications: Joi.boolean(),
      dataRefresh: Joi.number().min(5).max(300),
      language: Joi.string().valid('en', 'es', 'fr', 'de'),
    }),
    role: Joi.string().valid('user', 'researcher', 'admin'),
    subscription: Joi.string().valid('free', 'pro', 'enterprise'),
    emailVerified: Joi.boolean(),
    isActive: Joi.boolean(),
  }),

  deleteMe: Joi.object({
    password: Joi.string().required(),
  }),

  // Chat schemas
  createSession: Joi.object({
    title: Joi.string().max(200),
    focusAreas: Joi.array().items(
      Joi.string().valid(
        'exoplanets', 'blackholes', 'galaxies', 'stars',
        'nebulae', 'cosmology', 'solar-system', 'missions',
        'astrophotography', 'astronomy-basics'
      )
    ),
    expertiseLevel: Joi.string().valid('beginner', 'intermediate', 'expert'),
    temperature: Joi.number().min(0.1).max(1.0),
    maxTokens: Joi.number().min(100).max(4000),
    tags: Joi.array().items(Joi.string().max(50)),
  }),

  updateSession: Joi.object({
    title: Joi.string().max(200),
    focusAreas: Joi.array().items(
      Joi.string().valid(
        'exoplanets', 'blackholes', 'galaxies', 'stars',
        'nebulae', 'cosmology', 'solar-system', 'missions',
        'astrophotography', 'astronomy-basics'
      )
    ),
    expertiseLevel: Joi.string().valid('beginner', 'intermediate', 'expert'),
    temperature: Joi.number().min(0.1).max(1.0),
    maxTokens: Joi.number().min(100).max(4000),
    tags: Joi.array().items(Joi.string().max(50)),
    isArchived: Joi.boolean(),
    isPinned: Joi.boolean(),
  }),

  sendMessage: Joi.object({
    content: Joi.string().required().min(1).max(10000),
    model: Joi.string(),
    stream: Joi.boolean(),
    images: Joi.array().items(Joi.string().uri()),
  }),

  // Query schemas
  pagination: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    search: Joi.string(),
  }),

  sessionQuery: Joi.object({
    page: Joi.number().min(1).default(1),
    limit: Joi.number().min(1).max(100).default(20),
    archived: Joi.boolean(),
    pinned: Joi.boolean(),
    search: Joi.string(),
    tags: Joi.array().items(Joi.string()),
  }),

  searchQuery: Joi.object({
    q: Joi.string().min(2).required(),
    sessionId: Joi.string(),
    limit: Joi.number().min(1).max(100).default(50),
    offset: Joi.number().min(0).default(0),
  }),
};
