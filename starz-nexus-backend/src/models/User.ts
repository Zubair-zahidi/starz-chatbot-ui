import mongoose, { Document, Schema } from 'mongoose';
import bcrypt from 'bcryptjs';
import crypto from 'crypto';
import { IUser } from '../types/user.types';
import { logger } from '../utils/logger';

export interface IUserDocument extends IUser, Document {
  comparePassword(candidatePassword: string): Promise<boolean>;
  createVerificationToken(): string;
  createPasswordResetToken(): string;
  updateLastLogin(): Promise<void>;
  incrementStats(field: keyof IUser['stats'], amount?: number): Promise<void>;
}

const userSchema = new Schema<IUserDocument>(
  {
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please enter a valid email'],
    },
    username: {
      type: String,
      required: [true, 'Username is required'],
      unique: true,
      minlength: [3, 'Username must be at least 3 characters'],
      maxlength: [30, 'Username cannot exceed 30 characters'],
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      minlength: [8, 'Password must be at least 8 characters'],
      select: false,
    },
    avatar: {
      type: String,
      default: '',
    },
    role: {
      type: String,
      enum: ['user', 'researcher', 'admin'],
      default: 'user',
    },
    subscription: {
      type: String,
      enum: ['free', 'pro', 'enterprise'],
      default: 'free',
    },
    emailVerified: {
      type: Boolean,
      default: false,
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true,
    },
    // Increment to invalidate existing JWTs (checked against token payload).
    tokenVersion: {
      type: Number,
      default: 0,
      min: 0,
    },
    verificationToken: String,
    verificationTokenExpires: Date,
    resetPasswordToken: String,
    resetPasswordExpires: Date,
    lastLogin: Date,
    
    // Settings
    settings: {
      theme: {
        type: String,
        enum: ['dark', 'light', 'cosmic'],
        default: 'cosmic',
      },
      notifications: {
        type: Boolean,
        default: true,
      },
      dataRefresh: {
        type: Number,
        default: 30,
        min: 5,
        max: 300,
      },
      language: {
        type: String,
        enum: ['en', 'es', 'fr', 'de'],
        default: 'en',
      },
    },
    
    // Statistics
    stats: {
      chatSessions: {
        type: Number,
        default: 0,
        min: 0,
      },
      messagesSent: {
        type: Number,
        default: 0,
        min: 0,
      },
      observations: {
        type: Number,
        default: 0,
        min: 0,
      },
      totalTokensUsed: {
        type: Number,
        default: 0,
        min: 0,
      },
    },
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: function(doc, ret) {
        delete ret.password;
        delete ret.verificationToken;
        delete ret.resetPasswordToken;
        return ret;
      },
    },
    toObject: { virtuals: true },
  }
);

// Indexes
userSchema.index({ email: 1 }, { unique: true });
userSchema.index({ username: 1 }, { unique: true });
userSchema.index({ 'stats.totalTokensUsed': -1 });
userSchema.index({ createdAt: -1 });
userSchema.index({ role: 1 });

// Virtuals
userSchema.virtual('name').get(function() {
  return this.username;
});

// Pre-save middleware
userSchema.pre('save', async function(next) {
  // Only hash the password if it has been modified
  if (!this.isModified('password')) return next();
  
  try {
    // Generate salt
    const salt = await bcrypt.genSalt(12);
    
    // Hash password
    this.password = await bcrypt.hash(this.password, salt);
    
    next();
  } catch (error: any) {
    next(error);
  }
});

// Pre-update middleware
userSchema.pre('findOneAndUpdate', function(next) {
  this.set({ updatedAt: new Date() });
  next();
});

// Instance methods
userSchema.methods.comparePassword = async function(
  candidatePassword: string
): Promise<boolean> {
  try {
    return await bcrypt.compare(candidatePassword, this.password);
  } catch (error) {
    logger.error('Error comparing password:', error);
    return false;
  }
};

userSchema.methods.createVerificationToken = function(): string {
  const verificationToken = crypto.randomBytes(32).toString('hex');
  
  this.verificationToken = crypto
    .createHash('sha256')
    .update(verificationToken)
    .digest('hex');
    
  this.verificationTokenExpires = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
  
  return verificationToken;
};

userSchema.methods.createPasswordResetToken = function(): string {
  const resetToken = crypto.randomBytes(32).toString('hex');
  
  this.resetPasswordToken = crypto
    .createHash('sha256')
    .update(resetToken)
    .digest('hex');
    
  this.resetPasswordExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
  
  return resetToken;
};

userSchema.methods.updateLastLogin = async function(): Promise<void> {
  this.lastLogin = new Date();
  await this.save();
};

userSchema.methods.incrementStats = async function(
  field: keyof IUser['stats'], 
  amount: number = 1
): Promise<void> {
  this.stats[field] += amount;
  await this.save();
};

// Static methods
userSchema.statics.findByEmail = function(email: string) {
  return this.findOne({ email }).select('+password');
};

export const User = mongoose.model<IUserDocument>('User', userSchema);
