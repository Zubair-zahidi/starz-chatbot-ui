import { api } from './config';
import type { User } from '../../types';

export type PaginatedMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNext: boolean;
  hasPrev: boolean;
};

function normalizeUser(u: any): User {
  if (!u) return u;
  return { ...u, _id: u._id ?? u.id };
}

export const usersApi = {
  list: async (params?: { page?: number; limit?: number; search?: string; role?: string }) => {
    const res = await api.get('/users', { params });
    return {
      users: ((res?.data?.data ?? []) as any[]).map(normalizeUser),
      meta: (res?.data?.meta ?? null) as PaginatedMeta | null,
    };
  },

  update: async (userId: string, data: Partial<User> & { isActive?: boolean }) => {
    const res = await api.put(`/users/${userId}`, data);
    return normalizeUser(res?.data?.data?.user ?? res?.data?.data);
  },

  remove: async (userId: string) => {
    await api.delete(`/users/${userId}`);
  },
};
