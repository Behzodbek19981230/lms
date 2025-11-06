export type UserRole = 'superadmin' | 'admin' | 'teacher' | 'student';

export interface Center {
  id: number;
  name: string;
}

export interface User {
  id: number;
  username: string;
  firstName: string;
  lastName: string;
  fullName: string;
  role: UserRole;
  center: Center | null;
  telegramId?: string;
  telegramConnected?: boolean;
  hasCenterAssigned?: boolean;
  needsCenterAssignment?: boolean;
}

export interface AuthResponse {
  access_token: string;
  user: User;
}

export interface LoginCredentials {
  username: string;
  password: string;
}

export interface TelegramLoginData {
  telegramUserId: string;
}

export interface TelegramRegisterData {
  telegramUserId: string;
  telegramUsername: string;
  firstName: string;
  lastName?: string;
  photoUrl?: string;
  authDate: number;
  hash: string;
}
