// src/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect } from 'react';
import type { ReactNode } from 'react';
import type { User } from '../types';
import { authApi } from '../services/api/auth';
import { toast } from 'react-hot-toast';

interface AuthContextType {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (data: RegisterData) => Promise<void>;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
  isAuthenticated: boolean;
}

interface RegisterData {
  email: string;
  username: string;
  password: string;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const initAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (token) {
        try {
          const userData = await authApi.getProfile();
          setUser(userData);
        } catch (error) {
          console.error('Failed to fetch user profile:', error);
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
        }
      }
      setIsLoading(false);
    };

    initAuth();
  }, []);

  const login = async (email: string, password: string) => {
    try {
      const response = await authApi.login({ email, password });
      const { user, tokens } = response;
      
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);
      setUser(user);
      
      toast.success('Welcome to STARZ!');
    } catch (error: any) {
      const msg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Login failed';
      toast.error(msg);
      throw error;
    }
  };

  const register = async (data: RegisterData) => {
    try {
      const response = await authApi.register(data);
      const { user, tokens } = response as any;
      
      localStorage.setItem('access_token', tokens.access);
      localStorage.setItem('refresh_token', tokens.refresh);
      setUser(user);

      // Dev-friendly: auto-verify if backend returns a verification token
      const verificationToken = (response as any).verificationToken as string | undefined;
      if (verificationToken) {
        try {
          await authApi.verifyEmail(verificationToken);
        } catch {
          // Ignore - user can still verify via the backend endpoint.
        }
      }
      
      toast.success('Account created successfully!');
    } catch (error: any) {
      const msg =
        error?.response?.data?.error?.message ||
        error?.response?.data?.message ||
        error?.message ||
        'Registration failed';
      toast.error(msg);
      throw error;
    }
  };

  const logout = () => {
    localStorage.removeItem('access_token');
    localStorage.removeItem('refresh_token');
    setUser(null);
    toast.success('Logged out successfully');
  };

  const updateUser = (updatedData: Partial<User>) => {
    if (user) {
      setUser({ ...user, ...updatedData });
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        isLoading,
        login,
        register,
        logout,
        updateUser,
        isAuthenticated: !!user,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

