import { Request, Response, NextFunction } from 'express';
import { User } from '../models/User';
import { ChatSession } from '../models/ChatSession';
import { ApiResponse } from '../utils/response';
import { ApiError } from '../utils/apiError';
import { logger } from '../utils/logger';

/**
 * Get all users (admin only)
 */
export const getUsers = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { page = 1, limit = 20, search = '', role } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    // Build query
    const query: any = {};
    
    if (search) {
      query.$or = [
        { email: { $regex: search, $options: 'i' } },
        { username: { $regex: search, $options: 'i' } },
      ];
    }
    
    if (role) {
      query.role = role;
    }

    const [users, total] = await Promise.all([
      User.find(query)
        .skip(skip)
        .limit(Number(limit))
        .select('-password -verificationToken -resetPasswordToken')
        .sort({ createdAt: -1 })
        .lean(),
      User.countDocuments(query),
    ]);

    ApiResponse.paginated(res, users, total, Number(page), Number(limit));
  } catch (error) {
    next(error);
  }
};

/**
 * Get user by ID
 */
export const getUserById = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const currentUser = req.user!;

    // Users can only view their own profile unless they're admin
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      throw ApiError.forbidden('You can only view your own profile');
    }

    const user = await User.findById(userId)
      .select('-password -verificationToken -resetPasswordToken');

    if (!user) {
      throw ApiError.notFound('User not found');
    }

    ApiResponse.success(res, { user }, 'User retrieved successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update user (admin or self)
 */
export const updateUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const currentUser = req.user!;
    const data = req.body;

    // Users can only update their own profile unless they're admin
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      throw ApiError.forbidden('You can only update your own profile');
    }

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

    // Update fields (admins can update more fields)
    if (data.username !== undefined) user.username = data.username;
    if (data.avatar !== undefined) user.avatar = data.avatar;
    
    // Only admins can update these fields
    if (currentUser.role === 'admin') {
      if (data.role !== undefined) user.role = data.role;
      if (data.subscription !== undefined) user.subscription = data.subscription;
      if (data.emailVerified !== undefined) user.emailVerified = data.emailVerified;
      if (data.isActive !== undefined) (user as any).isActive = Boolean(data.isActive);
    }
    
    // User settings (any user can update their own settings)
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
        emailVerified: user.emailVerified,
        isActive: (user as any).isActive,
        lastLogin: user.lastLogin,
        createdAt: user.createdAt,
        updatedAt: user.updatedAt,
      },
    }, 'User updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Delete user (admin only)
 */
export const deleteUser = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const currentUser = req.user!;

    // Prevent self-deletion
    if (currentUser.id === userId) {
      throw ApiError.badRequest('You cannot delete your own account');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    // Delete user's chat sessions and messages
    await ChatSession.deleteMany({ userId });
    // Note: Messages will be deleted automatically due to cascade

    // Delete user
    await user.deleteOne();

    logger.info(`User ${userId} deleted by admin ${currentUser.id}`);

    ApiResponse.success(res, null, 'User deleted successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Update user role (admin only)
 */
export const updateUserRole = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const { role } = req.body;

    if (!['user', 'researcher', 'admin'].includes(role)) {
      throw ApiError.badRequest('Invalid role');
    }

    const user = await User.findById(userId);
    if (!user) {
      throw ApiError.notFound('User not found');
    }

    user.role = role;
    await user.save();

    logger.info(`User ${userId} role updated to ${role}`);

    ApiResponse.success(res, { user }, 'User role updated successfully');
  } catch (error) {
    next(error);
  }
};

/**
 * Get user's chat sessions
 */
export const getUserChats = async (
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const { userId } = req.params;
    const currentUser = req.user!;

    // Only admins can view other users' chats
    if (currentUser.id !== userId && currentUser.role !== 'admin') {
      throw ApiError.forbidden('You can only view your own chats');
    }

    const { page = 1, limit = 20 } = req.query;
    const skip = (Number(page) - 1) * Number(limit);

    const [sessions, total] = await Promise.all([
      ChatSession.find({ userId })
        .skip(skip)
        .limit(Number(limit))
        .sort({ 'metadata.lastActivity': -1 })
        .lean(),
      ChatSession.countDocuments({ userId }),
    ]);

    ApiResponse.paginated(res, sessions, total, Number(page), Number(limit));
  } catch (error) {
    next(error);
  }
};
