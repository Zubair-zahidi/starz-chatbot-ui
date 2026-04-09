// Keep ObjectId aligned with Mongoose to avoid BSON version mismatches.
import type { Types } from 'mongoose';

export type ObjectId = Types.ObjectId;

export interface IUser {
  email: string;
  username: string;
  password: string;
  avatar?: string;
  role: 'user' | 'researcher' | 'admin';
  subscription: 'free' | 'pro' | 'enterprise';
  emailVerified: boolean;
  isActive?: boolean;
  tokenVersion?: number;
  verificationToken?: string;
  verificationTokenExpires?: Date;
  resetPasswordToken?: string;
  resetPasswordExpires?: Date;
  lastLogin?: Date;
  settings: {
    theme: 'dark' | 'light' | 'cosmic';
    notifications: boolean;
    dataRefresh: number;
    language: 'en' | 'es' | 'fr' | 'de';
  };
  stats: {
    chatSessions: number;
    messagesSent: number;
    observations: number;
    totalTokensUsed: number;
  };
  createdAt?: Date;
  updatedAt?: Date;
}

export interface RegisterDTO {
  email: string;
  username: string;
  password: string;
}

export interface LoginDTO {
  email: string;
  password: string;
}

export interface UpdateUserDTO {
  username?: string;
  avatar?: string;
  settings?: Partial<IUser['settings']>;
}

export interface ChangePasswordDTO {
  currentPassword: string;
  newPassword: string;
}
