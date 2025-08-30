import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { Send, CheckCircle, AlertCircle, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

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
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <Send className="h-5 w-5" />
          Telegram Integration
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {status.isLinked ? (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <CheckCircle className="h-4 w-4 text-green-500" />
              <Badge className="bg-green-100 text-green-800">Connected</Badge>
            </div>
            <div>
              <p className="text-sm font-medium">
                {status.firstName} {status.lastName}
              </p>
              {status.telegramUsername && (
                <p className="text-xs text-gray-600">@{status.telegramUsername}</p>
              )}
            </div>
            
            {status.availableChannels.length > 0 && (
              <div className="space-y-2">
                <p className="text-sm font-medium">Available Channels:</p>
                <div className="space-y-1">
                  {status.availableChannels.slice(0, 2).map((channel) => (
                    <div key={channel.id} className="flex items-center justify-between text-xs">
                      <span className="truncate">
                        {channel.title || channel.username || `Channel ${channel.id}`}
                      </span>
                      {channel.inviteLink && (
                        <Button
                          size="sm"
                          variant="ghost"
                          className="h-6 px-2"
                          onClick={() => window.open(channel.inviteLink, '_blank')}
                        >
                          <ExternalLink className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                  {status.availableChannels.length > 2 && (
                    <p className="text-xs text-gray-500">
                      +{status.availableChannels.length - 2} more channels
                    </p>
                  )}
                </div>
              </div>
            )}
            
            <Button
              onClick={handleConnect}
              variant="outline"
              size="sm"
              className="w-full"
            >
              Manage Telegram
            </Button>
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-orange-500" />
              <Badge className="bg-orange-100 text-orange-800">Not Connected</Badge>
            </div>
            <p className="text-sm text-gray-600">
              Connect your Telegram account to receive test notifications and submit answers directly in Telegram.
            </p>
            <Button
              onClick={handleConnect}
              className="w-full"
              size="sm"
            >
              <Send className="h-4 w-4 mr-2" />
              Connect Telegram
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default TelegramConnectCard;