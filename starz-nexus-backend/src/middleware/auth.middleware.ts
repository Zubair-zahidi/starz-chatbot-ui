import { Request, Response, NextFunction } from 'express';
import { verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';
import { User } from '../models/User';
import { logger } from '../utils/logger';
import { config } from '../config';

/**
 * Authentication middleware
 * Verifies JWT token and attaches user to request
 */
export const authenticate = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Get token from header
    const authHeader = req.headers.authorization;
    
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw ApiError.unauthorized('No token provided');
    }

    const token = authHeader.split(' ')[1];
    
    // Verify token
    const decoded = verifyToken(token);

    if (decoded.tokenType !== 'access') {
      throw ApiError.unauthorized('Invalid token type');
    }
    
    // Check if user still exists
    const user = await User.findById(decoded.userId);
    
    if (!user) {
      throw ApiError.unauthorized('User no longer exists');
    }

    // Token revocation (password reset/change, manual invalidation, etc.)
    if (Number(user.tokenVersion || 0) !== Number(decoded.tokenVersion || 0)) {
      throw ApiError.unauthorized('Token is no longer valid');
    }

    if ((user as any).isActive === false) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Check if user account is active
    if (config.REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
      throw ApiError.forbidden('Please verify your email address');
    }

    // Attach user to request
    req.user = {
      id: user._id.toString(),
      email: user.email,
      role: user.role,
      subscription: user.subscription,
    };

    // Update last login (non-blocking)
    user.updateLastLogin().catch(err => 
      logger.error('Failed to update last login:', err)
    );

    next();
  } catch (error) {
    if (error instanceof ApiError) {
      next(error);
    } else {
      next(ApiError.unauthorized('Invalid token'));
    }
  }
};

/**
 * Role-based authorization middleware
 */
export const authorize = (...roles: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authenticated'));
    }

    if (!roles.includes(req.user.role)) {
      return next(
        ApiError.forbidden(
          `Access denied. Required roles: ${roles.join(', ')}`
        )
      );
    }

    next();
  };
};

/**
 * Subscription level authorization
 */
export const requireSubscription = (...subscriptions: string[]) => {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) {
      return next(ApiError.unauthorized('Not authenticated'));
    }

    if (!subscriptions.includes(req.user.subscription)) {
      return next(
        ApiError.forbidden(
          `This feature requires ${subscriptions.join(' or ')} subscription`
        )
      );
    }

    next();
  };
};

/**
 * Optional authentication middleware
 * Attaches user if token exists, but doesn't require it
 */
export const authenticateOptional = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;
    
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.split(' ')[1];
      const decoded = verifyToken(token);
      if (decoded.tokenType !== 'access') return next();
      
      const user = await User.findById(decoded.userId);
      
      if (
        user &&
        Number(user.tokenVersion || 0) === Number(decoded.tokenVersion || 0) &&
        (user as any).isActive !== false &&
        (!config.REQUIRE_EMAIL_VERIFICATION || user.emailVerified)
      ) {
        req.user = {
          id: user._id.toString(),
          email: user.email,
          role: user.role,
          subscription: user.subscription,
        };

        // Update last login
        user.updateLastLogin().catch(err => 
          logger.error('Failed to update last login:', err)
        );
      }
    }
  } catch (error) {
    // Don't throw error for optional auth
    logger.debug('Optional auth failed:', error);
  }

  next();
};

/**
 * Development helper: authenticate admin requests via `x-admin-key`.
 * Useful for Thunder Client / local testing when you don't want to deal with JWT headers.
 */
export const authenticateAdminApiKey = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!config.ALLOW_ADMIN_API_KEY || !config.ADMIN_API_KEY) return next();

  const key = String(req.headers['x-admin-key'] || '').trim();
  if (!key) return next();

  if (key !== config.ADMIN_API_KEY) {
    return next(ApiError.unauthorized('Invalid admin key'));
  }

  // Attach a virtual admin user for downstream `authorize('admin')` checks.
  req.user = {
    id: 'admin-api-key',
    email: 'admin@local',
    role: 'admin',
    subscription: 'enterprise',
  };

  next();
};

function isLocalhostIp(ip: string | undefined): boolean {
  if (!ip) return false;
  const v = ip.trim();
  return (
    v === '127.0.0.1' ||
    v === '::1' ||
    v.startsWith('::ffff:127.0.0.1') ||
    v === '::ffff:127.0.0.1'
  );
}

/**
 * Extremely insecure dev helper: if enabled, allow localhost requests to act as admin without auth.
 * This is ONLY for local development when you want to use Thunder Client without headers.
 */
export const authenticateInsecureLocalAdminNoAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
) => {
  if (!config.ALLOW_INSECURE_LOCAL_ADMIN_NO_AUTH) return next();
  if (!isLocalhostIp(req.ip)) return next();

  req.user = {
    id: 'insecure-local-admin',
    email: 'admin@local',
    role: 'admin',
    subscription: 'enterprise',
  };
  next();
};
