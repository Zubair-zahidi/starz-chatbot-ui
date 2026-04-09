// src/types/index.ts
export interface User {
  _id: string;
  email: string;
  username: string;
  avatar?: string;
  role: 'user' | 'researcher' | 'admin';
  subscription: 'free' | 'pro' | 'enterprise';
  emailVerified?: boolean;
  isActive?: boolean;
  createdAt: string;
  settings: {
    theme: 'dark' | 'light' | 'cosmic';
    notifications: boolean;
    dataRefresh: number;
  };
}

export interface ChatSession {
  _id: string;
  userId: string;
  title: string;
  messages: Message[];
  context: {
    astronomicalFocus: string[];
    lastQuery: string;
    expertiseLevel: 'beginner' | 'intermediate' | 'expert';
  };
  createdAt: string;
  updatedAt: string;
  isArchived: boolean;
}

export interface Message {
  _id: string;
  sessionId: string;
  content: string;
  role: 'user' | 'assistant' | 'system';
  timestamp: string;
  metadata?: {
    responseTime?: number;
    tokensUsed?: number;
    sources?: string[];
    confidence?: number;
  };
  isDeleted: boolean;
  deletedAt?: string;
}

export interface CelestialObject {
  _id: string;
  name: string;
  type: 'star' | 'planet' | 'galaxy' | 'nebula' | 'blackhole' | 'asteroid';
  coordinates: {
    ra: number;
    dec: number;
    distance: number;
  };
  physicalProperties: {
    mass: number;
    radius: number;
    temperature?: number;
    age?: number;
  };
  discoveryInfo: {
    discoveredBy: string;
    discoveryDate: string;
    discoveryMethod: string;
  };
  description: string;
  images: string[];
}

export interface AuthResponse {
  user: User;
  tokens: {
    access: string;
    refresh: string;
  };
}

export interface ApiError {
  message: string;
  status: number;
  errors?: Record<string, string[]>;
}
