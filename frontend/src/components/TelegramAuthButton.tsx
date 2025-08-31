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
  console.log('🚀 TelegramAuthButton component render qilinmoqda:', {
    botUsername,
    className,
    variant,
    size,
    timestamp: new Date().toISOString()
  });
  
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
    // Try to fix iframe multiple times
    const intervals = [1000, 2000, 3000, 5000];
    const timeouts: NodeJS.Timeout[] = [];
    
    intervals.forEach(delay => {
      const timeout = setTimeout(() => {
        const fixed = fixTelegramIframe();
        if (fixed) {
          console.log(`✅ Iframe ${delay}ms da to\'g\'irlandi`);
        } else {
          console.log(`⚠️ ${delay}ms da iframe topilmadi`);
          if (delay === 5000) {
            setShowManualButton(true);
          }
        }
      }, delay);
      timeouts.push(timeout);
    });

    return () => {
      timeouts.forEach(timeout => clearTimeout(timeout));
    };
  }, [currentBotUsername]);

  const openTelegramBot = () => {
    const botUrl = `https://t.me/${currentBotUsername}`;
    console.log(`🚀 Telegram botni ochish: ${botUrl}`);
    
    // Open bot in new tab
    const newWindow = window.open(botUrl, '_blank');
    
    if (newWindow) {
      toast({
        title: '🚀 Telegram bot ochildi!',
        description: `${currentBotUsername} boti yangi tabda ochildi. /start buyrug'ini yuboring va hisobingizni ulang.`,
        duration: 5000,
      });
    } else {
      // Fallback if popup blocked
      navigator.clipboard.writeText(botUrl).then(() => {
        toast({
          title: '📋 Havola nusxalandi',
          description: `Bot havolasi nusxalandi: ${botUrl}. Telegram da ochib /start yuboring.`,
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

  const fixTelegramIframe = () => {
    const iframe = document.querySelector('iframe[src*="oauth.telegram.org"]') as HTMLIFrameElement;
    if (iframe) {
      console.log('🔧 Telegram iframe o\'lchamlarini to\'g\'irlash');
      
      // Force iframe styling
      iframe.style.cssText = `
        min-height: 40px !important;
        height: 40px !important;
        width: 200px !important;
        max-width: 300px !important;
        display: block !important;
        visibility: visible !important;
        opacity: 1 !important;
        border: 1px solid #007acc !important;
        border-radius: 8px !important;
        background: #ffffff !important;
        overflow: visible !important;
      `;
      
      // Also try to fix the parent container
      const parent = iframe.parentElement;
      if (parent) {
        parent.style.cssText = `
          min-height: 50px !important;
          width: 100% !important;
          overflow: visible !important;
          display: block !important;
        `;
      }
      
      return true;
    }
    return false;
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
    <div className="space-y-3" style={{border: '3px solid red', padding: '20px', backgroundColor: 'yellow'}}>
      <h2 style={{color: 'red', fontSize: '20px', fontWeight: 'bold'}}>
        🚨 TELEGRAM AUTH BUTTON KOMPONENTI - TEST MODE 🚨
      </h2>
      
      {/* Debug info in development */}
      {import.meta.env.DEV && (
        <div className="text-xs text-gray-500 p-2 bg-gray-50 rounded border">
          <strong>🔍 Debug Ma'lumotlari:</strong><br/>
          <strong>Bot username:</strong> {currentBotUsername}<br/>
          <strong>Current domain:</strong> {window.location.hostname}:{window.location.port}<br/>
          <strong>Full URL:</strong> {window.location.origin}<br/>
          <strong>Environment:</strong> {import.meta.env.MODE}<br/>
          <strong>VITE_BOT_USERNAME:</strong> {import.meta.env.VITE_BOT_USERNAME || 'MAVJUD EMAS'}<br/>
          <strong>Component ishlamoqda:</strong> ✅<br/>
          <strong>Current time:</strong> {new Date().toLocaleTimeString()}
        </div>
      )}
      
      {/* LoginButton wrapper with error boundary */}
      <div className={className}>
        <div className="min-h-[50px] p-3 border-2 border-blue-300 rounded-lg bg-blue-50">
          <p className="text-sm text-blue-800 mb-3 font-semibold">
            📍 Telegram Login Button joylashuvi:
          </p>
          
          <div className="bg-white p-2 rounded border">
            <div style={{minHeight: '50px', width: '100%', overflow: 'visible'}}>
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
            
            {/* Manual iframe styling fix */}
            <style>{`
              #telegram-login-${currentBotUsername} {
                min-height: 40px !important;
                height: auto !important;
                width: 100% !important;
                max-width: 300px !important;
                overflow: visible !important;
                border: 1px solid #ddd !important;
                border-radius: 8px !important;
              }
              
              iframe[src*="oauth.telegram.org"] {
                min-height: 40px !important;
                height: auto !important;
                width: 100% !important;
                display: block !important;
                visibility: visible !important;
                opacity: 1 !important;
              }
            `}</style>
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
          
          {/* Direct bot connection button - always visible */}
          <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded">
            <p className="text-sm text-blue-700 mb-2 font-medium">
              📱 To'g'ridan-to'g'ri bot bilan ulanish:
            </p>
            <Button 
              onClick={openTelegramBot}
              variant="default"
              size="default"
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Send className="h-4 w-4 mr-2" />
              Botga ulanish
            </Button>
            <p className="text-xs text-blue-600 mt-2">
              Botni ochib /start buyrug'ini yuboring
            </p>
          </div>
          
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
        
        <Button
          type="button"
          variant="outline"
          size="sm"
          onClick={() => {
            const fixed = fixTelegramIframe();
            toast({
              title: fixed ? 'Iframe to\'g\'irlandi' : 'Iframe topilmadi',
              description: fixed ? 'Telegram button endi ko\'rinishi kerak' : 'Sahifani yangilab ko\'ring',
              variant: fixed ? 'default' : 'destructive'
            });
          }}
          className="text-xs"
        >
          🔧 Iframe to'g'irlash
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
