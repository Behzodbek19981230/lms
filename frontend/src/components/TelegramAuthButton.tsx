import React, { useState, useEffect } from 'react';
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
  botUsername?: string;
  onSuccess?: (user: TelegramUser) => void;
  onError?: (error: string) => void;
  className?: string;
  variant?: 'default' | 'outline' | 'ghost';
  size?: 'sm' | 'default' | 'lg';
}

export default function TelegramAuthButton({ 
  botUsername = import.meta.env.VITE_BOT_USERNAME || 'universal_lms_bot',
  onSuccess,
  onError,
  className,
  variant = 'default',
  size = 'default'
}: TelegramAuthButtonProps) {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [connected, setConnected] = useState(false);
  const [currentBotUsername] = useState(botUsername);

  const openTelegramBot = () => {
    const botUrl = `https://t.me/${currentBotUsername}`;
    console.log(`🚀 Opening Telegram bot: ${botUrl}`);
    
    const newWindow = window.open(botUrl, '_blank');
    
    if (newWindow) {
      toast({
        title: '🚀 Telegram bot ochildi!',
        description: `Bot yangi tabda ochildi. /start buyrug'ini yuboring.`,
        duration: 5000,
      });
    } else {
      navigator.clipboard.writeText(botUrl).then(() => {
        toast({
          title: '📋 Havola nusxalandi',
          description: `Bot havolasi nusxalandi: ${botUrl}`,
          duration: 5000,
        });
      }).catch(() => {
        toast({
          title: '🔗 Bot havolasi',
          description: `Qo'lda oching: ${botUrl}`,
          duration: 7000,
        });
      });
    }
  };

  const handleTelegramAuth = async (telegramUser: TelegramUser) => {
    try {
      setLoading(true);

      const userData = localStorage.getItem('EduOne_user');
      const user = userData ? JSON.parse(userData) : null;

      if (!user) {
        toast({
          title: 'Xato',
          description: 'Foydalanuvchi ma\'lumotlari topilmadi. Qayta kiring.',
          variant: 'destructive',
        });
        return;
      }

      const authResponse = await request.post('/telegram/authenticate', {
        telegramUserId: telegramUser.id.toString(),
        username: telegramUser.username,
        firstName: telegramUser.first_name,
        lastName: telegramUser.last_name
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
    <div className={`space-y-4 ${className}`}>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-medium text-foreground">Telegram orqali kirish</h3>
          {loading && <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />}
        </div>
        
        <div className="p-4 border border-border rounded-lg bg-card">
          <div className="space-y-4">
            <div className="min-h-[40px]">
              <LoginButton
                botUsername={currentBotUsername}
                buttonSize={size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'medium'}
                cornerRadius={8}
                showAvatar={true}
                lang="en"
                onAuthCallback={(user) => {
                  console.log('✅ Telegram auth successful:', user);
                  toast({
                    title: '🎉 Muvaffaqiyatli!',
                    description: `Telegram hisobingiz ulanmoqda...`,
                  });
                  handleTelegramAuth(user as TelegramUser);
                }}
              />
            </div>
            
            <div className="pt-3 border-t border-border">
              <p className="text-sm text-muted-foreground mb-3">
                Yoki to'g'ridan-to'g'ri botga ulanish:
              </p>
              <Button 
                onClick={openTelegramBot}
                variant="default"
                size={size}
                className="w-full bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Send className="h-4 w-4 mr-2" />
                Botga ulanish
              </Button>
              <p className="text-xs text-muted-foreground mt-2 text-center">
                Botni ochib /start buyrug'ini yuboring
              </p>
            </div>
          </div>
        </div>
        
        <div className="text-sm text-muted-foreground">
          <p className="flex items-start gap-2">
            <span className="text-blue-600 mt-0.5">ℹ️</span>
            Telegram orqali tizimga ulanish uchun yuqoridagi tugmalardan birini bosing va hisobingizni tasdiqlang.
          </p>
        </div>
      </div>
    </div>
  );
};
