// src/services/api/auth.ts
import type { AuthResponse, User, ApiUser } from '../../types';
import { api, unwrap } from './config';

function normalizeUser(u: ApiUser): User {
  if (!u || !(u._id || u.id)) throw new Error('Invalid user response');
  return {
    ...u,
    _id: (u._id ?? u.id)!,
  };
}

export const authApi = {
  login: async (credentials: { email: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post('/auth/login', credentials);
    const data = unwrap<{ user: ApiUser; tokens: { access: string; refresh: string } }>(response);
    return { user: normalizeUser(data.user), tokens: data.tokens };
  },

  register: async (payload: { email: string; username: string; password: string }): Promise<AuthResponse> => {
    const response = await api.post('/auth/register', payload);
    const data = unwrap<{ user: ApiUser; tokens: { access: string; refresh: string }; verificationToken?: string }>(
      response
    );
    return { user: normalizeUser(data.user), tokens: data.tokens, ...(data.verificationToken ? { verificationToken: data.verificationToken } : {}) };
  },

  getProfile: async (): Promise<User> => {
    const response = await api.get('/auth/me');
    const data = unwrap<{ user: ApiUser }>(response);
    return normalizeUser(data.user);
  },

  updateProfile: async (payload: Partial<User>): Promise<User> => {
    const response = await api.put('/auth/me', payload);
    const data = unwrap<{ user: ApiUser }>(response);
    return normalizeUser(data.user);
  },

  updateAvatar: async (file: File): Promise<{ avatar: string }> => {
    const form = new FormData();
    form.append('avatar', file);
    const response = await api.put('/auth/me/avatar', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return unwrap<{ avatar: string }>(response);
  },

  logout: async (): Promise<void> => {
    await api.post('/auth/logout');
  },

  forgotPassword: async (email: string): Promise<void> => {
    await api.post('/auth/forgot-password', { email });
  },

  resetPassword: async (token: string, password: string): Promise<void> => {
    await api.post('/auth/reset-password', { token, password });
  },

  verifyEmail: async (token: string): Promise<void> => {
    await api.get(`/auth/verify-email/${token}`);
  },

  deleteMe: async (password: string): Promise<void> => {
    await api.delete('/auth/me', { data: { password } });
  },
};
