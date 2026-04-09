import { Request, Response, NextFunction } from 'express';
import crypto from 'crypto';
import { User } from '../models/User';
import { generateAuthTokens, verifyToken } from '../utils/jwt';
import { ApiError } from '../utils/apiError';
import { ApiResponse } from '../utils/response';
import { logger } from '../utils/logger';
import { getFileUrl } from '../utils/fileUpload';
import { config } from '../config';
import { 
  RegisterDTO, 
  LoginDTO, 
  UpdateUserDTO, 
  ChangePasswordDTO 
} from '../types/user.types';
import { ChatSession } from '../models/ChatSession';
import { Message } from '../models/Message';

/**
 * Register new user
 */
export const register = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, username, password }: RegisterDTO = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ 
      $or: [{ email }, { username }] 
    });

    if (existingUser) {
      if (existingUser.email === email) {
        throw ApiError.conflict('Email already registered');
      }
      if (existingUser.username === username) {
        throw ApiError.conflict('Username already taken');
      }
    }

    // Create user
    const user = await User.create({
      email,
      username,
      password,
      emailVerified: config.REQUIRE_EMAIL_VERIFICATION ? false : true,
    });

    // Generate verification token (in production, send email)
    let verificationToken: string | undefined;
    if (config.REQUIRE_EMAIL_VERIFICATION) {
      verificationToken = user.createVerificationToken();
      await user.save();
    }

    // Generate tokens
    const tokens = generateAuthTokens(user);

    // Send welcome email (in production)
    logger.info(`New user registered: ${email}`);

    ApiResponse.created(res, {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        role: user.role,
        subscription: user.subscription,
        emailVerified: user.emailVerified,
        settings: user.settings,
      },
      tokens,
      ...(verificationToken ? { verificationToken } : {}),
    }, config.REQUIRE_EMAIL_VERIFICATION ? 'Registration successful. Please verify your email.' : 'Registration successful');
  } catch (error) {
    next(error);
  }
};

/**
 * Login user
 */
export const login = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email, password }: LoginDTO = req.body;

    // Find user with password
    const user = await User.findOne({ email }).select('+password');

    if (!user) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    // Check password
    const isPasswordValid = await user.comparePassword(password);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Invalid email or password');
    }

    if ((user as any).isActive === false) {
      throw ApiError.forbidden('Account is deactivated');
    }

    // Check if email is verified
    if (config.REQUIRE_EMAIL_VERIFICATION && !user.emailVerified) {
      throw ApiError.forbidden('Please verify your email address');
    }

    // Generate tokens
    const tokens = generateAuthTokens(user);

    // Update last login
    await user.updateLastLogin();

    logger.info(`User logged in: ${email}`);

    ApiResponse.success(res, {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        subscription: user.subscription,
        isActive: (user as any).isActive,
        settings: user.settings,
        stats: user.stats,
        lastLogin: user.lastLogin,
      },
      tokens,
    }, 'Login successful');
  } catch (error) {
    next(error);
  }
};

/**
 * Refresh access token
 */
export const refreshToken = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { refreshToken } = req.body;

    if (!refreshToken) {
      throw ApiError.badRequest('Refresh token is required');
    }

    // Verify refresh token
    const decoded = verifyToken(refreshToken);
    if (decoded.tokenType !== 'refresh') {
      throw ApiError.unauthorized('Invalid token type');
    }

    // Find user
    const user = await User.findById(decoded.userId);
    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (Number(user.tokenVersion || 0) !== Number(decoded.tokenVersion || 0)) {
      throw ApiError.unauthorized('Token is no longer valid');
    }

    // Generate new tokens
    const tokens = generateAuthTokens(user);

    ApiResponse.success(res, {
      tokens,
    }, 'Token refreshed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get current user profile
 */
/**
 * Get current user profile
 */
export const getProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const user = await User.findById(req.user!.id);
    
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    ApiResponse.success(res, {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        subscription: user.subscription,
        settings: user.settings,
        stats: user.stats,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    }, 'Profile retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update user profile
 */
export const updateProfile = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const data: UpdateUserDTO = req.body;

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Check if username is being changed and if it's already taken
    if (data.username && data.username !== user.username) {
      const existingUser = await User.findOne({ 
        username: data.username,
        _id: { $ne: userId }
      });
      
      if (existingUser) {
        throw ApiError.conflict('Username already taken');
      }
    }

    // Update user fields
    if (data.username !== undefined) user.username = data.username;
    if (data.avatar !== undefined) user.avatar = data.avatar;
    if (data.settings !== undefined) {
      user.settings = { ...user.settings, ...data.settings };
    }

    await user.save();

    ApiResponse.success(res, {
      user: {
        id: user._id,
        email: user.email,
        username: user.username,
        avatar: user.avatar,
        role: user.role,
        subscription: user.subscription,
        settings: user.settings,
        stats: user.stats,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    }, 'Profile updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Upload user avatar (multer)
 */
export const uploadAvatar = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    if (!req.file) {
      throw ApiError.badRequest('Avatar file is required');
    }

    const user = await User.findById(req.user!.id);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    const avatarUrl = getFileUrl(req as any, req.file.filename);
    user.avatar = avatarUrl;
    await user.save();

    ApiResponse.success(res, { avatar: avatarUrl }, 'Avatar updated');
  } catch (error) {
    next(error);
  }
};

/**
 * Change password
 */
export const changePassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { currentPassword, newPassword }: ChangePasswordDTO = req.body;

    const user = await User.findById(userId).select('+password');
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Verify current password
    const isPasswordValid = await user.comparePassword(currentPassword);
    if (!isPasswordValid) {
      throw ApiError.unauthorized('Current password is incorrect');
    }

    // Update password
    user.password = newPassword;
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    await user.save();

    // Invalidate all existing tokens (optional - you might want to implement token blacklisting)
    logger.info(`Password changed for user: ${user.email}`);

    ApiResponse.success(res, null, 'Password changed successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Request password reset
 */
export const forgotPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });
    if (!user) {
      // Don't reveal that user doesn't exist for security
      logger.debug(`Password reset requested for non-existent email: ${email}`);
      ApiResponse.success(res, null, 'If an account exists with this email, you will receive a password reset link');
      return;
    }

    // Generate reset token
    const resetToken = user.createPasswordResetToken();
    await user.save();

    // In production: Send email with reset link
    const resetUrl = `${process.env.FRONTEND_URL}/reset-password?token=${resetToken}`;
    logger.info(`Password reset token for ${email}: ${resetToken}`);
    logger.info(`Reset URL: ${resetUrl}`);

    // For development, return the token
    if (process.env.NODE_ENV === 'development') {
      ApiResponse.success(res, { 
        resetToken, // Only in development
        message: 'Password reset link generated' 
      }, 'Password reset link sent to email');
    } else {
      ApiResponse.success(res, null, 'Password reset link sent to email');
    }
  } catch (error) {
    next(error);
  }
};

/**
 * Reset password with token
 */
export const resetPassword = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token, password } = req.body;

    // Hash the token to compare with stored hash
    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() }
    });

    if (!user) {
      throw ApiError.badRequest('Invalid or expired reset token');
    }

    // Update password and clear reset token
    user.password = password;
    user.tokenVersion = Number(user.tokenVersion || 0) + 1;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();

    // Optional: Invalidate all existing tokens
    logger.info(`Password reset successfully for user: ${user.email}`);

    ApiResponse.success(res, null, 'Password reset successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Verify email with token
 */
export const verifyEmail = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { token } = req.params;

    const hashedToken = crypto
      .createHash('sha256')
      .update(token)
      .digest('hex');

    const user = await User.findOne({
      verificationToken: hashedToken,
      verificationTokenExpires: { $gt: new Date() }
    });

    if (!user) {
      throw ApiError.badRequest('Invalid or expired verification token');
    }

    // Mark email as verified and clear token
    user.emailVerified = true;
    user.verificationToken = undefined;
    user.verificationTokenExpires = undefined;
    await user.save();

    logger.info(`Email verified for user: ${user.email}`);

    // Redirect to frontend or show success message
    ApiResponse.success(res, null, 'Email verified successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Logout user (client-side token clearing)
 */
export const logout = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    // Note: JWT tokens are stateless, so we can't invalidate them server-side
    // without maintaining a blacklist. This endpoint is mainly for client-side cleanup.
    
    // Optional: You could implement token blacklisting here
    // For now, we'll just return success
    
    ApiResponse.success(res, null, 'Logged out successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user statistics
 */
export const getUserStats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Calculate additional stats if needed
    const stats = {
      ...user.stats,
      // Add calculated fields
      averageTokensPerMessage: user.stats.totalTokensUsed / Math.max(user.stats.messagesSent, 1),
      // You could add more stats here
    };

    ApiResponse.success(res, { stats }, 'User statistics retrieved');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete current user's account (requires password confirmation)
 */
export const deleteMyAccount = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const userId = req.user!.id;
    const { password } = req.body as { password: string };

    const user = await User.findById(userId).select('+password');
    if (!user) throw ApiError.notFound('User not found');

    const ok = await user.comparePassword(password);
    if (!ok) throw ApiError.unauthorized('Password is incorrect');

    // Delete associated chat data
    const sessions = await ChatSession.find({ userId: user._id }).select('_id').lean();
    const sessionIds = sessions.map((s: any) => s._id);
    if (sessionIds.length) {
      await Message.deleteMany({ sessionId: { $in: sessionIds } });
      await ChatSession.deleteMany({ userId: user._id });
    }

    await user.deleteOne();

    ApiResponse.success(res, null, 'Account deleted');
  } catch (error) {
    next(error);
  }
};
