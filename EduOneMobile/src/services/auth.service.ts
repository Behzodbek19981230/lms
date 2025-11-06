import axios, { AxiosInstance } from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { API_BASE_URL, AUTH_ENDPOINTS, DEFAULT_HEADERS } from '../config/api';
import {
  AuthResponse,
  LoginCredentials,
  TelegramLoginData,
  TelegramRegisterData,
} from '../types/user.types';

class AuthService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: API_BASE_URL,
      headers: DEFAULT_HEADERS,
    });

    // Add interceptor to include auth token in requests
    this.api.interceptors.request.use(
      async config => {
        const token = await AsyncStorage.getItem('e_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      error => {
        return Promise.reject(error);
      },
    );

    // Add interceptor to handle auth errors
    this.api.interceptors.response.use(
      response => response,
      async error => {
        if (error.response?.status === 401) {
          await AsyncStorage.removeItem('e_token');
          await AsyncStorage.removeItem('EduOne_user');
        }
        return Promise.reject(error);
      },
    );
  }

  async login(credentials: LoginCredentials): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>(
      AUTH_ENDPOINTS.LOGIN,
      credentials,
    );
    await this.setAuthData(response.data);
    return response.data;
  }

  async telegramLogin(data: TelegramLoginData): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>(
      AUTH_ENDPOINTS.TELEGRAM_LOGIN,
      data,
    );
    await this.setAuthData(response.data);
    return response.data;
  }

  async telegramRegister(data: TelegramRegisterData): Promise<AuthResponse> {
    const response = await this.api.post<AuthResponse>(
      AUTH_ENDPOINTS.TELEGRAM_REGISTER,
      data,
    );
    await this.setAuthData(response.data);
    return response.data;
  }

  async logout(): Promise<void> {
    await AsyncStorage.removeItem('e_token');
    await AsyncStorage.removeItem('EduOne_user');
  }

  async setAuthData(data: AuthResponse): Promise<void> {
    await AsyncStorage.setItem('e_token', data.access_token);
    await AsyncStorage.setItem('EduOne_user', JSON.stringify(data.user));
  }

  async getStoredUser(): Promise<any> {
    const user = await AsyncStorage.getItem('EduOne_user');
    return user ? JSON.parse(user) : null;
  }

  async getStoredToken(): Promise<string | null> {
    return await AsyncStorage.getItem('e_token');
  }

  async isAuthenticated(): Promise<boolean> {
    const token = await this.getStoredToken();
    return !!token;
  }
}

export default new AuthService();
