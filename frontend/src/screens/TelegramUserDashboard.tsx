import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import TelegramAuthButton from '@/components/TelegramAuthButton';
import { getApiErrorMessage } from '@/utils/api-error';

interface TelegramChat {
  id: number;
  chatId: string;
  type: 'channel' | 'private' | 'group';
  title?: string;
  username?: string;
  status: 'active' | 'inactive' | 'blocked';
  inviteLink?: string;
}

interface UserTelegramStatus {
  autoConnected: boolean;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  availableChannels: TelegramChat[];
}

const TelegramUserDashboard: React.FC = () => {
  const { toast } = useToast();
  const [status, setStatus] = useState<UserTelegramStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [registering, setRegistering] = useState(false);
  const [connectingToChannel, setConnectingToChannel] = useState<string | null>(null);
  const [connectingBot, setConnectingBot] = useState(false);

  const fetchTelegramStatus = async () => {
    try {
      setLoading(true);
      const response = await request.get('/telegram/user-status');
      setStatus({
        ...response.data,
        autoConnected: response.data.isLinked // Map isLinked to autoConnected
      });
    } catch (error) {
      console.error('Failed to fetch Telegram status:', error);
      setStatus({
        autoConnected: false,
        availableChannels: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleAuthSuccess = () => {
    toast({
      title: 'Muvaffaqiyat!',
      description: 'Telegram hisobingiz avtomatik ulandi va tegishli kanallarga taklifnomalar yuborildi!',
    });
    fetchTelegramStatus();
  };

  const handleAuthError = (error: string) => {
    toast({
      title: 'Xato',
      description: error,
      variant: 'destructive',
    });
  };

  const handleOpenBotConnectLink = async () => {
    try {
      setConnectingBot(true);
      const { data } = await request.post('/telegram/connect-link');
      if (data?.deepLink) {
        window.open(data.deepLink, '_blank');
        toast({
          title: 'Bot ochildi',
          description: 'Telegramda botni /start qiling. So‘ng bu sahifada "Yangilash" bosing.',
        });
      } else {
        toast({
          title: 'Xato',
          description: "Deep-link topilmadi",
          variant: 'destructive',
        });
      }
    } catch (e: any) {
      toast({
        title: 'Xato',
        description: getApiErrorMessage(e) || 'Botga ulanish havolasini olib bo‘lmadi',
        variant: 'destructive',
      });
    } finally {
      setConnectingBot(false);
    }
  };

  const handleJoinChannel = async (channel: TelegramChat) => {
    if (!channel.inviteLink && !channel.username) {
      toast({
        title: 'Xato',
        description: 'Bu kanal uchun havola mavjud emas',
        variant: 'destructive',
      });
      return;
    }

    setConnectingToChannel(channel.chatId);
    
    try {
      // Try to generate fresh invite link
      if (channel.chatId) {
        const response = await request.post(`/telegram/generate-invite/${encodeURIComponent(channel.chatId)}`);
        if (response.data.success && response.data.inviteLink) {
          window.open(response.data.inviteLink, '_blank');
          toast({
            title: 'Havola ochildi',
            description: `${channel.title || channel.username} kanaliga qo'shilish havolas ochildi`,
          });
        } else {
          // Fallback to existing link
          const link = channel.inviteLink || `https://t.me/${channel.username?.replace('@', '')}`;
          window.open(link, '_blank');
        }
      }
    } catch (error) {
      // Fallback to existing link
      const link = channel.inviteLink || `https://t.me/${channel.username?.replace('@', '')}`;
      window.open(link, '_blank');
    } finally {
      setConnectingToChannel(null);
    }
  };

  const handleRegister = async () => {
    try {
      setRegistering(true);
      const response = await request.post('/telegram/register-user');
      
      if (response.data.success) {
        toast({
          title: 'Muvaffaqiyat',
          description: response.data.message,
        });
        
        if (response.data.channels && response.data.channels.length > 0) {
          toast({
            title: 'Kanallar mavjud',
            description: `Sizda ${response.data.channels.length} ta kanalga kirish huquqi bor`,
          });
        }
        
        fetchTelegramStatus();
      } else {
        toast({
          title: 'Ro\'yxatga olish muvaffaqiyatsiz',
          description: response.data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Xato',
        description: 'Telegram bot bilan ro\'yxatga olishda xatolik',
        variant: 'destructive',
      });
    } finally {
      setRegistering(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text).then(() => {
      toast({
        title: 'Nusxalandi',
        description: 'Havola buferga nusxalandi',
      });
    });
  };

  const openTelegramLink = (link: string) => {
    window.open(link, '_blank');
  };

  useEffect(() => {
    fetchTelegramStatus();
  }, []);

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'active':
        return <Badge className="bg-green-100 text-green-800">Faol</Badge>;
      case 'inactive':
        return <Badge className="bg-yellow-100 text-yellow-800">Nofaol</Badge>;
      case 'blocked':
        return <Badge className="bg-red-100 text-red-800">Bloklangan</Badge>;
      default:
        return <Badge className="bg-gray-100 text-gray-800">Noma'lum</Badge>;
    }
  };

  const getChannelTypeText = (type: string) => {
    switch (type) {
      case 'channel': return 'Kanal';
      case 'group': return 'Guruh';
      case 'private': return 'Shaxsiy';
      default: return type;
    }
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Telegram Integratsiyasi</h1>
        </div>
        <Card>
          <CardContent className="flex items-center justify-center py-8">
            <p>Telegram holatini yuklamoqda...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Telegram Integratsiyasi</h1>
        <Button onClick={fetchTelegramStatus} disabled={loading}>
          {loading ? 'Yuklanmoqda...' : 'Yangilash'}
        </Button>
      </div>

      {/* Connection Status */}
      <Card>
        <CardHeader>
          <CardTitle>Telegram Ulanish Holati</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {status?.autoConnected ? (
            <div className="flex items-center gap-4">
              <Badge className="bg-green-100 text-green-800">Avtomatik ulangan</Badge>
              <div>
                <p className="font-medium">
                  {status.firstName} {status.lastName}
                </p>
                {status.telegramUsername && (
                  <p className="text-sm text-gray-600">@{status.telegramUsername}</p>
                )}
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              <Badge className="bg-red-100 text-red-800">Avtomatik ulanmagan</Badge>
              <p className="text-gray-600">
                Test xabarnomalari olish va Telegramda to'g'ridan-to'g'ri javob berish uchun Telegram hisobingizni avtomatik ulang.
              </p>
              <div className="space-y-2">
                <Button
                  onClick={handleOpenBotConnectLink}
                  disabled={connectingBot}
                  className="w-full sm:w-auto"
                >
                  {connectingBot ? 'Tayyorlanmoqda...' : 'Botga ulanish (avto)'}
                </Button>
                <p className="text-sm text-gray-600">
                  Tugmani bosing → Telegram bot ochiladi → <code className="bg-gray-100 px-1 rounded">/start</code> → keyin bu yerda <b>Yangilash</b>.
                </p>
              </div>
              {/* Enhanced authentication with auto-connect */}
              <TelegramAuthButton
                onSuccess={handleAuthSuccess}
                onError={handleAuthError}
                className="w-full sm:w-auto"
              />
              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h4 className="font-semibold text-blue-800 mb-2">680 Avtomatik ulanish</h4>
                <p className="text-sm text-blue-700">
                  Tizim sizning ismingiz asosida avtomatik ulanishga harakat qiladi. 
                  Agar avtomatik ulanish ishlamasa, o'qituvchingiz bilan bog'lanib qo'lda ulanishni so'rang.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Available Channels */}
      {status?.availableChannels && status.availableChannels.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle>Mavjud Kanallar</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                Test xabarnomalari olish va sinf faoliyatlarida qatnashish uchun quyidagi kanallarga qo'shiling:
              </p>
              
              <div className="grid gap-4">
                {status.availableChannels.map((channel) => (
                  <div
                    key={channel.id}
                    className="border rounded-lg p-4 flex items-center justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center gap-3">
                        <h3 className="font-semibold">
                          {channel.title || channel.username || channel.chatId}
                        </h3>
                        {getStatusBadge(channel.status)}
                      </div>
                      
                      {channel.username && (
                        <p className="text-sm text-gray-600">{channel.username}</p>
                      )}
                      
                      <Badge className="bg-blue-100 text-blue-800">
                        {getChannelTypeText(channel.type)}
                      </Badge>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleJoinChannel(channel)}
                        disabled={connectingToChannel === channel.chatId}
                      >
                        {connectingToChannel === channel.chatId ? 'Ochilmoqda...' : 'Havolani olish'}
                      </Button>
                      
                      {channel.inviteLink && (
                        <Button
                          size="sm"
                          onClick={() => window.open(channel.inviteLink!, '_blank')}
                        >
                          Kanalga qo'shilish
                        </Button>
                      )}
                      
                      {channel.username && (
                        <Button
                          size="sm"
                          onClick={() => window.open(`https://t.me/${channel.username!.replace('@', '')}`, '_blank')}
                        >
                          {channel.inviteLink ? 'Alternativ' : 'Kanalga qo\'shilish'}
                        </Button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle>Telegram integratsiyasidan qanday foydalanish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold">📱 1-qadam: Hisobingizni ulang</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mt-2">
                <li>Yuqoridagi "Telegramga ulash" tugmasini bosing</li>
                <li>Telegram botini oching va /start ni yuboring</li>
                <li>O'qituvchingiz hisobingizni bog'lashini kuting</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold">📢 2-qadam: Kanallarga qo'shiling</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mt-2">
                <li>Sinf kanallaringiz uchun "Kanalga qo'shilish" tugmasini bosing</li>
                <li>Ushbu kanallarda test xabarnomalari olasiz</li>
                <li>Ota-onalar ham jarayonni kuzatish uchun qo'shilishlari mumkin</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">✍️ 3-qadam: Testlarga javob bering</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mt-2">
                <li>Testlar e'lon qilinganda, quyidagi formatda javob bering: <code className="bg-gray-100 px-1 rounded">#T123Q1 A</code></li>
                <li>T123 = Test ID, Q1 = 1-savol, A = Sizning javobingiz</li>
                <li>Har bir javobga darhol fikr-mulohaza oling</li>
                <li>E'lon qilinganida yakuniy natijalarni ko'ring</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">❓ Yordam kerakmi?</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1 mt-2">
                <li>Ko'rsatmalar uchun botga /help yuboring</li>
                <li>Hisob bog'lash uchun o'qituvchingiz bilan bog'laning</li>
                <li>To'g'ri kanallarga qo'shilganingizni tekshiring</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramUserDashboard;