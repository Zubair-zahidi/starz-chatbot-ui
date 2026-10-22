import React, { useMemo, useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, Search, Shield, ToggleLeft, ToggleRight, Trash2, Users } from 'lucide-react';
import type { User } from '../types';
import { useAuth } from '../contexts/authState';
import { api, unwrap } from '../services/api/config';
import { usersApi } from '../services/api/users';

const Admin: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const qc = useQueryClient();

  const [search, setSearch] = useState('');

  const { data, isLoading, error } = useQuery({
    queryKey: ['admin-stats'],
    queryFn: async () => {
      const res = await api.get('/admin/stats');
      return unwrap<{ users?: { total?: number }; chat?: { totalSessions?: number }; system?: { ollama?: { connected?: boolean } } }>(res);
    },
    refetchInterval: 15000,
    enabled: isAdmin,
  });

  const usersQuery = useQuery({
    queryKey: ['admin-users', search],
    queryFn: async () => {
      return usersApi.list({ page: 1, limit: 50, search: search.trim() || undefined });
    },
    enabled: isAdmin,
  });

  const activeCount = useMemo(() => {
    const users = usersQuery.data?.users ?? [];
    return users.filter((u) => u.isActive !== false).length;
  }, [usersQuery.data]);

  const toggleMutation = useMutation({
    mutationFn: async (payload: { userId: string; isActive: boolean }) => {
      return usersApi.update(payload.userId, { isActive: payload.isActive });
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (userId: string) => {
      await usersApi.remove(userId);
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['admin-users'] });
      qc.invalidateQueries({ queryKey: ['admin-stats'] });
    },
  });

  if (!isAdmin) {
    return (
      <div className="quantum-card p-6">
        <div className="flex items-center gap-3">
          <Shield className="w-5 h-5 text-stellar-pink" />
          <div>
            <p className="font-semibold">Admin access required</p>
            <p className="text-sm text-stellar-silver">This page is only available to admin accounts.</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between">
        <div>
          <h1 className="font-orbitron text-3xl font-bold text-gradient mb-2">Admin Console</h1>
          <p className="text-stellar-silver">System telemetry, AI service health, and platform metrics.</p>
        </div>
        <div className="flex items-center gap-2 px-4 py-2 rounded-2xl glass-effect">
          <Shield className="w-4 h-4 text-stellar-pink" />
          <span className="text-sm font-semibold">Admin Only</span>
        </div>
      </div>

      <div className="quantum-card p-6">
        {isLoading && (
          <div className="flex items-center gap-2 text-stellar-silver">
            <Activity className="w-4 h-4 animate-pulse" />
            Loading metrics...
          </div>
        )}
        {error && <div className="text-red-400">Failed to load admin stats.</div>}
        {data && (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="p-4 rounded-2xl bg-cosmic-matter/40 border border-stellar-blue/10">
              <p className="text-sm text-stellar-silver">Total Users</p>
              <p className="font-orbitron text-2xl text-stellar-teal">{data.users?.total ?? '-'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-cosmic-matter/40 border border-stellar-blue/10">
              <p className="text-sm text-stellar-silver">Chat Sessions</p>
              <p className="font-orbitron text-2xl text-stellar-teal">{data.chat?.totalSessions ?? '-'}</p>
            </div>
            <div className="p-4 rounded-2xl bg-cosmic-matter/40 border border-stellar-blue/10">
              <p className="text-sm text-stellar-silver">Ollama Connected</p>
              <p className="font-orbitron text-2xl text-stellar-teal">
                {String(data.system?.ollama?.connected ?? false)}
              </p>
            </div>
          </div>
        )}
      </div>

      <div className="quantum-card p-6 space-y-4">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <div className="flex items-center gap-3">
            <Users className="w-5 h-5 text-stellar-teal" />
            <div>
              <p className="font-orbitron text-xl">User Management</p>
              <p className="text-sm text-stellar-silver">
                Active: {activeCount} / {(usersQuery.data?.users?.length ?? 0)}
              </p>
            </div>
          </div>

          <div className="relative">
            <Search className="w-4 h-4 text-stellar-silver absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search email or username..."
              className="pl-9 pr-3 py-2 rounded-xl bg-cosmic-matter/40 border border-stellar-blue/15 outline-none focus:border-stellar-blue/40 w-[min(28rem,86vw)]"
            />
          </div>
        </div>

        {usersQuery.isLoading && (
          <div className="flex items-center gap-2 text-stellar-silver">
            <Activity className="w-4 h-4 animate-pulse" />
            Loading users...
          </div>
        )}
        {usersQuery.error && <div className="text-red-400">Failed to load users.</div>}

        {usersQuery.data && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-stellar-silver">
                  <th className="py-2 pr-3">User</th>
                  <th className="py-2 pr-3">Role</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 pr-3">Created</th>
                  <th className="py-2 pr-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {usersQuery.data.users.map((u: User) => {
                  const active = u.isActive !== false;
                  return (
                    <tr key={u._id} className="border-t border-stellar-blue/10">
                      <td className="py-3 pr-3">
                        <div className="font-semibold">{u.username}</div>
                        <div className="text-xs text-stellar-silver">{u.email}</div>
                      </td>
                      <td className="py-3 pr-3">{u.role}</td>
                      <td className="py-3 pr-3">
                        <span
                          className={[
                            'inline-flex items-center px-2 py-1 rounded-lg border text-xs font-semibold',
                            active
                              ? 'border-emerald-500/30 bg-emerald-500/10 text-emerald-200'
                              : 'border-rose-500/30 bg-rose-500/10 text-rose-200',
                          ].join(' ')}
                        >
                          {active ? 'Active' : 'Deactivated'}
                        </span>
                      </td>
                      <td className="py-3 pr-3 text-stellar-silver">
                        {u.createdAt ? new Date(u.createdAt).toLocaleString() : '-'}
                      </td>
                      <td className="py-3 pr-3">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => toggleMutation.mutate({ userId: u._id, isActive: !active })}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-cosmic-matter/40 border border-stellar-blue/15 hover:border-stellar-blue/35 transition-colors"
                            title={active ? 'Deactivate user' : 'Activate user'}
                            disabled={toggleMutation.isPending || deleteMutation.isPending}
                          >
                            {active ? (
                              <ToggleRight className="w-4 h-4 text-emerald-300" />
                            ) : (
                              <ToggleLeft className="w-4 h-4 text-rose-300" />
                            )}
                            <span className="text-xs font-semibold">{active ? 'Deactivate' : 'Activate'}</span>
                          </button>
                          <button
                            type="button"
                            onClick={() => {
                              if (!confirm(`Delete user ${u.username} (${u.email})?`)) return;
                              deleteMutation.mutate(u._id);
                            }}
                            className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-rose-500/10 border border-rose-500/20 hover:border-rose-500/40 transition-colors"
                            title="Delete user"
                            disabled={toggleMutation.isPending || deleteMutation.isPending}
                          >
                            <Trash2 className="w-4 h-4 text-rose-300" />
                            <span className="text-xs font-semibold">Delete</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};

export default Admin;

