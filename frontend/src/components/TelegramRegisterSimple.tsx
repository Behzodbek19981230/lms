import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MessageSquare } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface Props {
  onSuccess?: (token: string, user: any) => void;
  onError?: (error: string) => void;
}

declare global {
  interface Window {
    onTelegramAuth: (user: TelegramUser) => void;
  }
}

const TelegramRegisterSimple: React.FC<Props> = ({ onSuccess, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();
  
  const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'universal_lmsbot';

  const handleTelegramAuth = async (user: TelegramUser) => {
    console.log('Telegram auth received:', user);

    if (!user.username) {
      toast({
        title: 'Xatolik',
        description: 'Telegram foydalanuvchi nomingiz mavjud emas. Iltimos, Telegram\'da username o\'rnating.',
        variant: 'destructive',
      });
      onError?.('Telegram username not available');
      return;
    }

    setIsLoading(true);
    
    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';
      console.log('Sending registration request to:', `${API_BASE_URL}/api/auth/telegram/register`);
      
      const response = await fetch(`${API_BASE_URL}/api/auth/telegram/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          telegramUserId: user.id.toString(),
          telegramUsername: user.username,
          firstName: user.first_name,
          lastName: user.last_name,
          photoUrl: user.photo_url,
          authDate: user.auth_date,
          hash: user.hash,
        }),
      });

      const data = await response.json();
      console.log('Response:', data);

      if (!response.ok) {
        throw new Error(data.message || 'Ro\'yxatdan o\'tishda xatolik yuz berdi');
      }

      // Save token and user data
      localStorage.setItem('token', data.access_token);
      
      // Update auth context
      await login(data.access_token, data.user);
      
      toast({
        title: 'Muvaffaqiyatli!',
        description: `Salom ${data.user.firstName}! Telegram orqali muvaffaqiyatli ro'yxatdan o'tdingiz.`,
      });
      
      onSuccess?.(data.access_token, data.user);
      
    } catch (error: any) {
      console.error('Telegram registration failed:', error);
      toast({
        title: 'Xatolik',
        description: error.message || 'Telegram orqali ro\'yxatdan o\'tishda xatolik yuz berdi',
        variant: 'destructive',
      });
      onError?.(error.message);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    // Set up global callback
    window.onTelegramAuth = handleTelegramAuth;
    
    return () => {
      delete window.onTelegramAuth;
    };
  }, []);

  return (
    <Card className="w-full max-w-md">
      <CardHeader className="text-center">
        <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-blue-100">
          <MessageSquare className="h-6 w-6 text-blue-600" />
        </div>
        <CardTitle className="text-xl font-semibold">
          Telegram orqali ro'yxatdan o'tish
        </CardTitle>
        <CardDescription>
          Telegram hisobingiz orqali tezda ro'yxatdan o'ting
        </CardDescription>
      </CardHeader>
      
      <CardContent className="space-y-4">
        <div className="text-center space-y-4">
          <p className="text-sm text-gray-600">
            Bot: <code className="bg-gray-100 px-1 rounded">{TELEGRAM_BOT_USERNAME}</code>
          </p>
          
          {/* Telegram Login Button */}
          <div
            dangerouslySetInnerHTML={{
              __html: `
                <script async src="https://telegram.org/js/telegram-widget.js?22"
                  data-telegram-login="${TELEGRAM_BOT_USERNAME}"
                  data-size="large"
                  data-onauth="onTelegramAuth(user)"
                  data-request-access="write">
                </script>
              `
            }}
          />
          
          {isLoading && (
            <div className="text-center">
              <div className="inline-flex items-center space-x-2">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
                <span className="text-sm text-gray-600">Ro'yxatdan o'tmoqda...</span>
              </div>
            </div>
          )}
          
          <div className="text-xs text-gray-500 space-y-1">
            <p>• Telegram hisobingizda username bo'lishi kerak</p>
            <p>• Bot bilan avval muloqot qilmagan bo'lishingiz kerak</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default TelegramRegisterSimple;
