import axios from 'axios';

export function getApiErrorMessage(err: unknown): string | null {
  if (axios.isAxiosError(err)) {
    const data: any = err.response?.data;
    const message = data?.message;
    if (typeof message === 'string' && message.trim()) return message;
    if (Array.isArray(message)) {
      const joined = message.filter(Boolean).join(', ');
      if (joined.trim()) return joined;
    }
    if (typeof data?.error === 'string' && data.error.trim()) return data.error;
    if (typeof err.message === 'string' && err.message.trim()) return err.message;
    return null;
  }

  if (err instanceof Error) return err.message || null;
  if (typeof err === 'string') return err;
  return null;
}
