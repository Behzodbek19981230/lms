import {
  API_BASE_URL as ENV_API_BASE_URL,
  FILE_BASE_URL as ENV_FILE_BASE_URL,
} from '@env';

// API Configuration
// Uses .env file for configuration
// For development with local backend:
//   - Android emulator: API_BASE_URL=http://10.0.2.2:3003/api
//   - Real device: API_BASE_URL=http://192.168.x.x:3003/api (replace with your computer's IP)
// For production: API_BASE_URL=https://lms.api.universal-uz.uz/api
export const API_BASE_URL = ENV_API_BASE_URL || 'http://10.0.2.2:3003/api';
export const FILE_BASE_URL = ENV_FILE_BASE_URL || 'http://10.0.2.2:3003';

// API Endpoints
export const AUTH_ENDPOINTS = {
  LOGIN: '/auth/login',
  REGISTER: '/auth/register',
  TELEGRAM_LOGIN: '/auth/telegram/login',
  TELEGRAM_REGISTER: '/auth/telegram/register',
  CHANGE_PASSWORD: '/auth/change-password',
  TELEGRAM_CONNECT: '/telegram/auth/connect',
  TELEGRAM_STATUS: '/telegram/auth/status',
  TELEGRAM_DISCONNECT: '/telegram/auth/disconnect',
};

export const USER_ENDPOINTS = {
  PROFILE: '/users/profile',
  UPDATE_PROFILE: '/users/profile',
};

// Default headers
export const DEFAULT_HEADERS = {
  'Content-Type': 'application/json',
};
