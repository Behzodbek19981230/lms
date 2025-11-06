import { create } from 'zustand';
import { User } from '../types/user.types';
import AuthService from '../services/auth.service';

interface AuthState {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: string | null;
}

interface AuthActions {
  login: (username: string, password: string) => Promise<void>;
  telegramLogin: (telegramUserId: string) => Promise<void>;
  logout: () => Promise<void>;
  checkAuthStatus: () => Promise<void>;
  clearError: () => void;
}

const useAuthStore = create<AuthState & AuthActions>((set, _get) => ({
  user: null,
  isAuthenticated: false,
  isLoading: true, // Start with true to check auth status
  error: null,

  login: async (username, password) => {
    set({ isLoading: true, error: null });
    try {
      const response = await AuthService.login({ username, password });
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  telegramLogin: async telegramUserId => {
    set({ isLoading: true, error: null });
    try {
      const response = await AuthService.telegramLogin({ telegramUserId });
      set({
        user: response.user,
        isAuthenticated: true,
        isLoading: false,
      });
    } catch (error: any) {
      set({
        error: error.response?.data?.message || 'Telegram login failed',
        isLoading: false,
      });
      throw error;
    }
  },

  logout: async () => {
    try {
      await AuthService.logout();
      set({
        user: null,
        isAuthenticated: false,
        isLoading: false,
        error: null,
      });
    } catch (error: any) {
      set({
        error: error.message || 'Logout failed',
      });
    }
  },

  checkAuthStatus: async () => {
    console.log('[Auth] Starting auth check...');
    set({ isLoading: true });
    try {
      // Add timeout to prevent infinite loading
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Auth check timeout')), 5000),
      );

      const checkPromise = (async () => {
        const isAuthenticated = await AuthService.isAuthenticated();
        console.log('[Auth] Is authenticated:', isAuthenticated);
        if (isAuthenticated) {
          const user = await AuthService.getStoredUser();
          console.log('[Auth] User found:', user);
          set({
            user,
            isAuthenticated: true,
            isLoading: false,
          });
        } else {
          console.log('[Auth] No user found');
          set({
            isAuthenticated: false,
            isLoading: false,
          });
        }
      })();

      await Promise.race([checkPromise, timeoutPromise]);
    } catch (error) {
      // On any error, set as not authenticated
      console.log('[Auth] Auth check error:', error);
      set({
        isAuthenticated: false,
        isLoading: false,
      });
    }
    console.log('[Auth] Auth check completed');
  },

  clearError: () => set({ error: null }),
}));

export default useAuthStore;
