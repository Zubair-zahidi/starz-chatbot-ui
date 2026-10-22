import { isAxiosError } from 'axios';

export function errorMessage(error: unknown, fallback: string): string {
  if (isAxiosError<{ error?: { message?: string }; message?: string }>(error)) {
    const message = error.response?.data?.error?.message ?? error.response?.data?.message;
    if (typeof message === 'string' && message) return message;
  }
  return error instanceof Error && error.message ? error.message : fallback;
}
