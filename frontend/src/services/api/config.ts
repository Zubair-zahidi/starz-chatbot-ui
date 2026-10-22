// src/services/api/config.ts
import axios from 'axios';

// In dev, Vite proxies `/api` to the backend (see vite.config.ts).
const API_BASE_URL = import.meta.env.VITE_API_URL || '/api';

export const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('access_token');
  if (token) {
    config.headers = config.headers ?? {};
    config.headers.Authorization = `Bearer ${token}`;
  } else {
    // Guest mode: identify client for limited unauthenticated chat usage
    let guestId = localStorage.getItem('guest_id');
    if (!guestId) {
      guestId = (globalThis.crypto?.randomUUID?.() || `${Date.now()}-${Math.random()}`).toString();
      localStorage.setItem('guest_id', guestId);
    }
    config.headers = config.headers ?? {};
    config.headers['x-guest-id'] = guestId;
  }
  return config;
});

// Unwrap our backend response shape: { success, message, data, meta? }
export function unwrap<T>(response: { data: unknown }): T {
  const payload = response.data;
  if (payload && typeof payload === 'object' && 'data' in payload) return payload.data as T;
  return payload as T;
}
