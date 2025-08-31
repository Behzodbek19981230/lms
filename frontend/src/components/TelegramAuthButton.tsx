import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { Send, CheckCircle, Loader2 } from 'lucide-react';
import { LoginButton } from '@telegram-auth/react';

interface TelegramUser {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  photo_url?: string;
  auth_date: number;
  hash: string;
}

interface TelegramAuthButtonProps {
  botUsername?: string; // Your bot username (without @)
  onSuccess?: (user: TelegramUser) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export default function TelegramAuthButton({ 
  botUsername = import.meta.env.VITE_BOT_USERNAME || 'edunimbus_bot',
  onSuccess,
  onError,
  className,
  variant = 'default',
  size = 'default'
}: TelegramAuthButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);

  const handleTelegramAuth = async (telegramUser: TelegramUser) => {
    try {
      setLoading(true);

      // Get current user from localStorage
      const userData = localStorage.getItem('edunimbus_user');
      const user = userData ? JSON.parse(userData) : null;

      if (!user) {
        toast({
          title: 'Xato',
          description: 'Foydalanuvchi ma\'lumotlari topilmadi. Qayta kiring.',
          variant: 'destructive',
        });
        return;
      }

      // Send Telegram user data to backend for verification and linking
      const authResponse = await request.post('/telegram/authenticate', {
        telegramUserId: telegramUser.id,
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name,
        photoUrl: telegramUser.photo_url,
        authDate: telegramUser.auth_date,
        hash: telegramUser.hash,
        userId: user.id // Link to current logged-in user
      });

      if (authResponse.data.success) {
        setConnected(true);
        toast({
          title: 'Muvaffaqiyat!',
          description: 'Telegram hisobingiz muvaffaqiyatli ulandi!',
        });
        onSuccess?.(telegramUser);
      } else {
        toast({
          title: 'Xato',
          description: authResponse.data.message || 'Telegram ulanishida xatolik',
          variant: 'destructive',
        });
        onError?.(authResponse.data.message);
      }
    } catch (error: any) {
      console.error('Telegram auth error:', error);
      const errorMessage = error.response?.data?.message || 'Ulanishda xatolik yuz berdi';
      toast({
        title: 'Xato',
        description: errorMessage,
        variant: 'destructive',
      });
      onError?.(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleTelegramError = (error: Error) => {
    console.error('Telegram auth error:', error);
    toast({
      title: 'Xato',
      description: 'Telegram autentifikatsiyasida xatolik yuz berdi',
      variant: 'destructive',
    });
    onError?.(error.message);
  };

  if (connected) {
    return (
      <Button
        variant="outline"
        size={size}
        className={className}
        disabled
      >
        <CheckCircle className="h-4 w-4 mr-2 text-green-500" />
        Telegram ulangan
      </Button>
    );
  }

  return (
    <div className="space-y-3">
      <LoginButton
        botUsername={botUsername}
        buttonSize={size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'medium'}
        cornerRadius={8}
        showAvatar={true}
        lang="en"
        onAuthCallback={(user) => {
          handleTelegramAuth(user as TelegramUser);
        }}
        className={className}
      />
      
      {loading && (
        <div className="flex items-center justify-center gap-2 text-sm text-gray-600">
          <Loader2 className="h-4 w-4 animate-spin" />
          Ulanmoqda...
        </div>
      )}
      
      {!connected && (
        <div className="text-xs text-gray-600 space-y-1">
          <p>📱 <strong>Ma'lumot:</strong></p>
          <p className="ml-2">
            Telegram orqali kirish uchun yuqoridagi tugmani bosing va
            Telegram hisobingiz bilan tasdiqlang.
          </p>
        </div>
      )}
    </div>
  );
};
