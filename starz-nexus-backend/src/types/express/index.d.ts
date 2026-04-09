import { Request } from 'express';

declare global {
  namespace Express {
    interface Request {
      user?: {
        id: string;
        email: string;
        role: string;
        subscription: string;
      };
      guestId?: string;
    }
  }
}

export interface TokenPayload {
  userId: string;
  email: string;
  role: string;
  subscription: string;
  tokenType: 'access' | 'refresh';
  tokenVersion: number;
  iat: number;
  exp: number;
}

export interface Tokens {
  access: string;
  refresh: string;
}
