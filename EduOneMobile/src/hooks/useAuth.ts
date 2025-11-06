import { useState } from 'react';
import AuthService from '../services/auth.service';
import useAuthStore from '../store/auth.store';
import { handleApiError } from '../utils/errorHandler';
import {
  LoginCredentials,
  TelegramLoginData,
  TelegramRegisterData,
} from '../types/user.types';

export const useAuth = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [isCheckingAuth, setIsCheckingAuth] = useState(false);
  const {
    user,
    isAuthenticated,
    login: storeLogin,
    telegramLogin: storeTelegramLogin,
    logout: storeLogout,
  } = useAuthStore();

  // Note: We don't check auth status here anymore
  // It's handled in AppNavigator to avoid double checking

  const checkAuthStatus = async () => {
    setIsCheckingAuth(true);
    try {
      await useAuthStore.getState().checkAuthStatus();
    } catch (error) {
      handleApiError(error, 'Avtorizatsiya holatini tekshirishda xatolik');
    } finally {
      setIsCheckingAuth(false);
    }
  };

  const login = async (credentials: LoginCredentials) => {
    setIsLoading(true);
    try {
      await storeLogin(credentials.username, credentials.password);
    } catch (error) {
      handleApiError(error, 'Login qilishda xatolik');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const telegramLogin = async (data: TelegramLoginData) => {
    setIsLoading(true);
    try {
      const response = await AuthService.telegramLogin(data);
      await storeTelegramLogin(data.telegramUserId);
      return response;
    } catch (error) {
      handleApiError(error, 'Telegram orqali login qilishda xatolik');
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const telegramRegister = async (data: TelegramRegisterData) => {
    setIsLoading(true);
    try {
      const response = await AuthService.telegramRegister(data);
      // After registration, we should login the user
      await storeLogin(data.telegramUsername, ''); // Empty password for Telegram users
      return response;
    } catch (error) {
      handleApiError(error, "Telegram orqali ro'yxatdan o'tishda xatolik");
      throw error;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    setIsLoading(true);
    try {
      await AuthService.logout();
      await storeLogout();
    } catch (error) {
      handleApiError(error, 'Chiqishda xatolik');
    } finally {
      setIsLoading(false);
    }
  };

  return {
    user,
    isAuthenticated,
    isLoading,
    isCheckingAuth,
    login,
    telegramLogin,
    telegramRegister,
    logout,
    checkAuthStatus,
  };
};
