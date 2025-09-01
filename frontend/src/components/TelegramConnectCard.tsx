import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { Send, CheckCircle, AlertCircle, ExternalLink, Users, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import TelegramAuthButton from './TelegramAuthButton';

interface TelegramStatus {
  isLinked: boolean;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  availableChannels: Array<{
    id: number;
    title?: string;
    username?: string;
    inviteLink?: string;
  }>;
}

const TelegramConnectCard: React.FC = () => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [status, setStatus] = useState<TelegramStatus | null>(null);
  const [loading, setLoading] = useState(false);
  const [connecting, setConnecting] = useState(false);

  const fetchStatus = async () => {
    try {
      setLoading(true);
      const response = await request.get('/telegram/user-status');
      setStatus(response.data);
    } catch (error) {
      console.error('Failed to fetch Telegram status:', error);
      setStatus({
        isLinked: false,
        availableChannels: []
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStatus();
  }, []);

  const handleConnect = () => {
    navigate('/account/telegram-user');
  };

  const handleAuthSuccess = () => {
    toast({
      title: 'Muvaffaqiyat!',
      description: 'Telegram hisobingiz muvaffaqiyatli ulandi!',
    });
    fetchStatus(); // Refresh status
  };

  const handleAuthError = (error: string) => {
    toast({
      title: 'Xato',
      description: error,
      variant: 'destructive',
    });
  };

  if (loading) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Send className="h-5 w-5" />
            Telegram Integration
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-gray-500">Loading...</p>
        </CardContent>
      </Card>
    );
  }

  if (!status) {
    return null;
  }

  return (
    <Card className="shadow-card hover:shadow-hover transition-all duration-500 hover:-translate-y-1 bg-gradient-card backdrop-blur-sm animate-slide-up border-border/50">
      <CardHeader className="pb-4">
        <CardTitle className="flex items-center gap-3">
          <div className="p-2 rounded-lg bg-gradient-to-r from-blue-500 to-purple-600">
            <Send className="h-5 w-5 text-white" />
          </div>
          <span className="bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent font-bold">
            Telegram Integration
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.isLinked ? (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500 rounded-full">
                  <CheckCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <Badge className="bg-gradient-to-r from-green-500 to-emerald-500 text-white shadow-sm font-semibold">
                    Ulangan
                  </Badge>
                  <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse mt-1"></div>
                </div>
              </div>
            </div>
            
            <div className="p-3 bg-gradient-subtle rounded-lg border border-border/50">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                  <span className="text-white font-bold text-sm">{status.firstName?.charAt(0)}</span>
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground">
                    {status.firstName} {status.lastName}
                  </p>
                  {status.telegramUsername && (
                    <p className="text-xs text-muted-foreground font-mono">@{status.telegramUsername}</p>
                  )}
                </div>
              </div>
            </div>
            
            {status.availableChannels.length > 0 && (
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <div className="w-1 h-4 bg-gradient-primary rounded-full"></div>
                  <p className="text-sm font-semibold text-foreground">Mavjud kanallar:</p>
                </div>
                <div className="space-y-2">
                  {status.availableChannels.slice(0, 2).map((channel, index) => (
                    <div 
                      key={channel.id} 
                      className="flex items-center justify-between p-2 bg-blue-50 rounded-lg border border-blue-200 hover:bg-blue-100 transition-colors animate-fade-in"
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                        <span className="text-xs font-medium text-blue-700 truncate">
                          {channel.title || channel.username || `Kanal ${channel.id}`}
                        </span>
                      </div>
                      {channel.inviteLink && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2 hover:bg-blue-200 transition-colors"
                          onClick={() => window.open(channel.inviteLink, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3 text-blue-600" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {status.availableChannels.length > 2 && (
                    <div className="text-center p-2 bg-gray-50 rounded-lg border border-gray-200">
                      <p className="text-xs text-gray-600 font-medium">
                        +{status.availableChannels.length - 2} ta boshqa kanal
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )}
            
            <Button
              onClick={handleConnect}
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 text-white shadow-sm hover:shadow-md transition-all duration-300 hover:scale-105"
              size="sm"
            >
              <Users className="h-4 w-4 mr-2" />
              Telegram boshqaruvi
            </Button>
          </div>
        ) : (
          <div className="space-y-4 animate-fade-in">
            <div className="flex items-center justify-between p-3 bg-gradient-to-r from-orange-50 to-yellow-50 rounded-lg border border-orange-200">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-orange-500 rounded-full">
                  <AlertCircle className="h-4 w-4 text-white" />
                </div>
                <div>
                  <Badge className="bg-gradient-to-r from-orange-500 to-yellow-500 text-white shadow-sm font-semibold">
                    Ulanmagan
                  </Badge>
                  <div className="w-2 h-2 bg-orange-400 rounded-full animate-pulse mt-1"></div>
                </div>
              </div>
            </div>
            
            <div className="p-4 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
              <div className="flex items-start gap-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-full flex items-center justify-center flex-shrink-0">
                  <Send className="h-5 w-5 text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-foreground mb-1">
                    Telegram integratsiyasi
                  </p>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    Telegram hisobingizni ulang va test xabarnomalarini to'g'ridan-to'g'ri Telegram orqali oling.
                  </p>
                </div>
              </div>
            </div>
            
            {/* Enhanced connection with auto-auth */}
            <div className="space-y-3">
              <div className="p-1 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg">
                <TelegramAuthButton
                  onSuccess={handleAuthSuccess}
                  onError={handleAuthError}
                  className="w-full bg-white hover:bg-gray-50 text-gray-800 border-0 shadow-none hover:shadow-sm transition-all duration-300"
                  size="sm"
                />
              </div>
              
              <div className="flex items-center gap-3">
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
                <span className="text-xs text-muted-foreground px-3 bg-background rounded-full border border-border">
                  yoki
                </span>
                <div className="flex-1 h-px bg-gradient-to-r from-transparent via-gray-300 to-transparent"></div>
              </div>
              
              <Button
                onClick={handleConnect}
                className="w-full bg-gradient-subtle border border-border hover:shadow-card transition-all duration-300 hover:scale-105 hover:-translate-y-0.5"
                size="sm"
              >
                <Users className="h-4 w-4 mr-2" />
                Telegram boshqaruvi
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramConnectCard;