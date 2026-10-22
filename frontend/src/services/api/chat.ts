// src/services/api/chat.ts
import { api, unwrap } from './config';
import type { ChatSession, Message } from '../../types';

export const chatApi = {
  getSessions: async (): Promise<ChatSession[]> => {
    const response = await api.get('/chat/sessions');
    const data = unwrap<ChatSession[]>(response);
    return data;
  },

  createSession: async (title: string, options?: { context?: Partial<ChatSession['context']>; isArchived?: boolean }): Promise<ChatSession> => {
    const response = await api.post('/chat/sessions', { title, ...(options || {}) });
    const data = unwrap<{ session: ChatSession }>(response);
    return data.session;
  },

  getSession: async (id: string): Promise<ChatSession> => {
    const response = await api.get(`/chat/sessions/${id}`);
    const data = unwrap<{ session: ChatSession }>(response);
    return data.session;
  },

  deleteSession: async (id: string): Promise<void> => {
    await api.delete(`/chat/sessions/${id}`);
  },

  clearSession: async (id: string): Promise<void> => {
    await api.delete(`/chat/sessions/${id}/messages`);
  },

  sendMessage: async (
    sessionId: string,
    content: string,
    options?: { model?: string; stream?: boolean; images?: string[]; signal?: AbortSignal }
  ): Promise<{ userMessage: Message; aiMessage: Message }> => {
    const response = await api.post(
      `/chat/sessions/${sessionId}/messages`,
      {
        content,
        ...(options || {}),
      },
      {
        signal: options?.signal,
      }
    );
    return unwrap<{ userMessage: Message; aiMessage: Message }>(response);
  },

  // Guest mode endpoints
  createGuestSession: async (title?: string): Promise<ChatSession> => {
    const response = await api.post('/chat/guest/sessions', { title });
    const data = unwrap<{ session: ChatSession }>(response);
    return data.session;
  },

  getGuestSession: async (id: string): Promise<ChatSession> => {
    const response = await api.get(`/chat/guest/sessions/${id}`);
    const data = unwrap<{ session: ChatSession }>(response);
    return data.session;
  },

  sendGuestMessage: async (
    sessionId: string,
    content: string,
    options?: { model?: string; stream?: boolean; images?: string[]; signal?: AbortSignal }
  ): Promise<{ userMessage: Message; aiMessage: Message }> => {
    const response = await api.post(
      `/chat/guest/sessions/${sessionId}/messages`,
      {
        content,
        ...(options || {}),
      },
      {
        signal: options?.signal,
      }
    );
    return unwrap<{ userMessage: Message; aiMessage: Message }>(response);
  },

  clearGuestSession: async (id: string): Promise<void> => {
    await api.delete(`/chat/guest/sessions/${id}/messages`);
  },

  deleteMessage: async (messageId: string): Promise<void> => {
    await api.delete(`/chat/messages/${messageId}`);
  },

  exportSession: async (sessionId: string, format: 'json' | 'csv' | 'txt'): Promise<Blob> => {
    const response = await api.get(`/chat/sessions/${sessionId}/export`, {
      params: { format },
      responseType: 'blob',
    });
    return response.data;
  },
};
