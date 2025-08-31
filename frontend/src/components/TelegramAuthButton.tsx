import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { Send, CheckCircle, Loader2, AlertTriangle } from 'lucide-react';
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
  const [currentBotUsername, setCurrentBotUsername] = useState(botUsername);
  const [showManualButton, setShowManualButton] = useState(false);
  
  // Fallback bot usernames to try
  const fallbackBotUsernames = [
    'universal_lms_bot',
    'edunimbus_bot', 
    'universallmsbot',
    'universal_edu_bot'
  ];

  // Check if Telegram scripts loaded after component mount
  useEffect(() => {
    const timer = setTimeout(() => {
      // If LoginButton didn't render properly, show manual option
      if (!document.querySelector('iframe[src*="oauth.telegram.org"]')) {
        setShowManualButton(true);
        console.warn('⚠️ Telegram widget yuklanmadi, manual button ko\'rsatilmoqda');
      }
    }, 3000);

    return () => clearTimeout(timer);
  }, [currentBotUsername]);

  const openTelegramBot = () => {
    const botUrl = `https://t.me/${currentBotUsername}`;
    window.open(botUrl, '_blank');
    toast({
      title: 'Telegram bot ochildi',
      description: `${currentBotUsername} boti yangi tabda ochildi. /start buyrug\'ini yuboring.`,
    });
  };

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

  const tryNextBotUsername = () => {
    const currentIndex = fallbackBotUsernames.indexOf(currentBotUsername);
    const nextIndex = (currentIndex + 1) % fallbackBotUsernames.length;
    setCurrentBotUsername(fallbackBotUsernames[nextIndex]);
    
    toast({
      title: 'Bot username o\'zgartirildi',
      description: `Yangi bot username: ${fallbackBotUsernames[nextIndex]}`,
    });
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
      {/* Debug info in development */}
      {import.meta.env.DEV && (
        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded border">
          <strong>🔍 Debug Ma'lumotlari:</strong><br/>
          <strong>Bot username:</strong> {currentBotUsername}<br/>
          <strong>Current domain:</strong> {window.location.hostname}:{window.location.port}<br/>
          <strong>Full URL:</strong> {window.location.origin}<br/>
          <strong>Environment:</strong> {import.meta.env.MODE}<br/>
          <strong>VITE_BOT_USERNAME:</strong> {import.meta.env.VITE_BOT_USERNAME || 'MAVJUD EMAS'}<br/>
          <strong>Component ishlamoqda:</strong> ✅
        </div>
      )}
      
      {/* LoginButton wrapper with error boundary */}
      <div className={className}>
        <div className="min-h-[50px] p-3 border-2 border-blue-300 rounded-lg bg-blue-50">
          <p className="text-sm text-blue-800 mb-3 font-semibold">
            📍 Telegram Login Button joylashuvi:
          </p>
          
          <div className="bg-white p-2 rounded border">
            <LoginButton
              botUsername={currentBotUsername}
              buttonSize={size === 'sm' ? 'small' : size === 'lg' ? 'large' : 'medium'}
              cornerRadius={8}
              showAvatar={true}
              lang="en"
              onAuthCallback={(user) => {
                console.log('✅ Telegram auth callback ishlamoqda:', user);
                toast({
                  title: 'Callback ishlamoqda',
                  description: `Telegram user: ${user.first_name}`,
                });
                handleTelegramAuth(user as TelegramUser);
              }}
            />
          </div>
          
          {/* Manual fallback button */}
          {showManualButton && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-xs text-yellow-700 mb-2">
                ⚠️ Widget yuklanmadi. Manual ulanishni sinab ko'ring:
              </p>
              <Button 
                onClick={openTelegramBot}
                variant="outline"
                size="sm"
                className="w-full"
              >
                <Send className="h-4 w-4 mr-2" />
                {currentBotUsername} botini ochish
              </Button>
            </div>
          )}
          
          <p className="text-xs text-blue-600 mt-2">
            Agar button ko'rinmasa, browser consoleni tekshiring
          </p>
        </div>
      </div>
      
      {/* Alternative bot username button */}
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={tryNextBotUsername}
          className="text-xs"
        >
          Boshqa bot username sinab ko'rish
        </Button>
      </div>
      
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
          
          {import.meta.env.DEV && (
            <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
              <p className="text-yellow-800 font-semibold">⚠️ "Bot domain invalid" xatosi ko'rsatilsa:</p>
              <ol className="text-yellow-700 text-xs mt-1 ml-4 list-decimal">
                <li>@BotFather botiga o'ting</li>
                <li>/mybots buyrug'ini yuboring</li>
                <li>Botingizni tanlang ({currentBotUsername})</li>
                <li>Bot Settings → Domain sozlamalariga o'ting</li>
                <li>Quyidagi domenni qo'shing: <code className="bg-white px-1 rounded">{window.location.hostname}</code></li>
              </ol>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
