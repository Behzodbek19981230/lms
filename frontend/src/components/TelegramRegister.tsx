import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { MessageSquare, User, CheckCircle, AlertTriangle } from 'lucide-react';
import { useToast } from '@/components/ui/use-toast';
import { useAuth } from '@/contexts/AuthContext';

// Telegram Login Widget types
interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramLoginWidgetProps {
  botName: string;
  onAuth: (user: TelegramUser) => void;
  requestAccess?: 'write';
  size?: 'large' | 'medium' | 'small';
  cornerRadius?: number;
  usePic?: boolean;
}

declare global {
  interface Window {
    TelegramLoginWidget: {
      dataOnauth: (user: TelegramUser) => void;
    };
  }
}

interface Props {
  onSuccess?: (token: string, user: any) => void;
  onError?: (error: string) => void;
}

const TelegramRegister: React.FC<Props> = ({ onSuccess, onError }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [scriptLoaded, setScriptLoaded] = useState(false);
  const { toast } = useToast();
  const { login } = useAuth();
  
  // Telegram bot username from environment
  const TELEGRAM_BOT_USERNAME = import.meta.env.VITE_TELEGRAM_BOT_USERNAME || 'your_bot_username';

  useEffect(() => {
    // Load Telegram Login Widget script
    const script = document.createElement('script');
    script.src = 'https://telegram.org/js/telegram-widget.js?22';
    script.async = true;
    script.onload = () => setScriptLoaded(true);
    document.body.appendChild(script);

    // Set up global callback for Telegram auth
    window.TelegramLoginWidget = {
      dataOnauth: handleTelegramAuth,
    };

    return () => {
      document.body.removeChild(script);
      delete window.TelegramLoginWidget;
    };
  }, []);

  const handleTelegramAuth = async (user: TelegramUser) => {
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
      const response = await fetch(`${API_BASE_URL}/auth/telegram/register`, {
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
        {/* Benefits */}
        <div className="space-y-3 rounded-lg bg-blue-50 p-4">
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-700">
              Telegram username avtomatik ishlatiladi
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-700">
              Xavfsiz va tezkor ro'yxatdan o'tish
            </span>
          </div>
          <div className="flex items-center space-x-2">
            <CheckCircle className="h-4 w-4 text-green-600" />
            <span className="text-sm text-gray-700">
              Qo'shimcha parol kerak emas
            </span>
          </div>
        </div>

        {/* Requirements */}
        <div className="space-y-2 rounded-lg bg-yellow-50 p-4">
          <div className="flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-yellow-600" />
            <span className="text-sm font-medium text-yellow-800">
              Talablar:
            </span>
          </div>
          <ul className="text-sm text-yellow-700 space-y-1 ml-6">
            <li>• Telegram hisobingizda username bo'lishi kerak</li>
            <li>• Telegram hisobi boshqa foydalanuvchi bilan bog'lanmagan bo'lishi kerak</li>
            <li>• Bot bilan avval muloqot qilmagan bo'lishingiz kerak</li>
          </ul>
        </div>

        {/* Telegram Login Button */}
        <div className="flex justify-center">
          {scriptLoaded ? (
            <div
              dangerouslySetInnerHTML={{
                __html: `
                  <script
                    async
                    src="https://telegram.org/js/telegram-widget.js?22"
                    data-telegram-login="${TELEGRAM_BOT_USERNAME}"
                    data-size="large"
                    data-onauth="TelegramLoginWidget.dataOnauth(user)"
                    data-request-access="write">
                  </script>
                `
              }}
            />
          ) : (
            <Button disabled className="w-full">
              <MessageSquare className="mr-2 h-4 w-4" />
              Telegram widget yuklanmoqda...
            </Button>
          )}
        </div>

        {isLoading && (
          <div className="text-center">
            <div className="inline-flex items-center space-x-2">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
              <span className="text-sm text-gray-600">Ro'yxatdan o'tmoqda...</span>
            </div>
          </div>
        )}

        {/* Instructions */}
        <div className="space-y-2 text-center">
          <p className="text-xs text-gray-500">
            "Login with Telegram" tugmasini bosish orqali siz{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Foydalanish shartlari
            </a>{' '}
            va{' '}
            <a href="#" className="text-blue-600 hover:underline">
              Maxfiylik siyosati
            </a>{' '}
            bilan rozisiz.
          </p>
        </div>

        {/* User Status Indicators */}
        <div className="flex justify-center space-x-2">
          <Badge variant="secondary" className="text-xs">
            <User className="mr-1 h-3 w-3" />
            Student sifatida ro'yxatdan o'tadi
          </Badge>
        </div>

        {/* Alternative Login Link */}
        <div className="text-center">
          <p className="text-sm text-gray-600">
            Allaqachon hisobingiz bormi?{' '}
            <a
              href="/login"
              className="font-medium text-blue-600 hover:text-blue-500"
            >
              Tizimga kirish
            </a>
          </p>
        </div>
      </CardContent>
    </Card>
  );
};

export default TelegramRegister;
