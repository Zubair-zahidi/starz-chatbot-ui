import jwt from 'jsonwebtoken';
import { config } from '../config';
import { TokenPayload, Tokens } from '../types/express';
import { ApiError } from './apiError';
import { logger } from './logger';

/**
 * Generate JWT token
 */
export const generateToken = (
  payload: Omit<TokenPayload, 'iat' | 'exp'>,
  expiresIn: jwt.SignOptions['expiresIn']
): string => {
  try {
    return jwt.sign(payload, config.JWT_SECRET as jwt.Secret, { expiresIn });
  } catch (error: any) {
    logger.error('Error generating token:', error);
    throw new ApiError('Failed to generate token', 500);
  }
};

/**
 * Verify JWT token
 */
export const verifyToken = (token: string): TokenPayload => {
  try {
    return jwt.verify(token, config.JWT_SECRET as jwt.Secret) as TokenPayload;
  } catch (error: any) {
    if (error?.name === 'TokenExpiredError') {
      throw new ApiError('Token expired', 401, 'TOKEN_EXPIRED');
    }
    if (error?.name === 'JsonWebTokenError') {
      throw new ApiError('Invalid token', 401, 'INVALID_TOKEN');
    }
    throw new ApiError('Token verification failed', 401);
  }
};

/**
 * Generate access and refresh tokens
 */
export const generateAuthTokens = (user: any): Tokens => {
  const basePayload = {
    userId: user._id.toString(),
    email: user.email,
    role: user.role,
    subscription: user.subscription,
    tokenVersion: Number(user.tokenVersion || 0),
  };

  const accessToken = generateToken(
    { ...basePayload, tokenType: 'access' as const },
    config.JWT_EXPIRE as jwt.SignOptions['expiresIn']
  );
  const refreshToken = generateToken(
    { ...basePayload, tokenType: 'refresh' as const },
    config.JWT_REFRESH_EXPIRE as jwt.SignOptions['expiresIn']
  );

  return { access: accessToken, refresh: refreshToken };
};

/**
 * Decode token without verification
 */
export const decodeToken = (token: string): any => {
  try {
    return jwt.decode(token);
  } catch (error) {
    logger.error('Error decoding token:', error);
    return null;
  }
};

/**
 * Check if token is about to expire
 */
export const isTokenExpiringSoon = (token: string, thresholdMinutes: number = 5): boolean => {
  try {
    const decoded = jwt.decode(token) as any;
    if (!decoded || !decoded.exp) return true;
    
    const expiresIn = decoded.exp * 1000 - Date.now();
    return expiresIn < thresholdMinutes * 60 * 1000;
  } catch (error) {
    return true;
  }
};
