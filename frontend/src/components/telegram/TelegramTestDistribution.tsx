import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { 
  FileText, 
  MessageSquare, 
  Users, 
  CheckCircle, 
  AlertCircle,
  Download,
  Loader2,
  Send
} from 'lucide-react';

import { telegramService } from '@/services/telegram.service';
import { TelegramChat, PDFDistributionResult, ChatType } from '@/types/telegram.type';
import TelegramAuthWidget from './TelegramAuthWidget';

interface TelegramTestDistributionProps {
  testId?: number;
  shareUrl?: string;
  channels: TelegramChat[];
  selectedChannelId: string;
  onChannelSelect: (channelId: string) => void;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
}

const TelegramTestDistribution: React.FC<TelegramTestDistributionProps> = ({
  testId,
  shareUrl,
  channels,
  selectedChannelId,
  onChannelSelect,
  onSuccess,
  onError
}) => {
  const [loading, setLoading] = useState(false);
  const [distributionResult, setDistributionResult] = useState<PDFDistributionResult | null>(null);
  const selectedChannel = channels.find(ch => ch.chatId === selectedChannelId);

  const handleSendPDFTests = async () => {
    if (!testId || !selectedChannelId) {
      onError('Iltimos, test va kanalni tanlang');
      return;
    }

    try {
      setLoading(true);
      const result = await telegramService.sendTestPDFsToChannel(testId, selectedChannelId);
      
      setDistributionResult(result);
      
      if (result.success) {
        onSuccess(`PDF testlar muvaffaqiyatli yuborildi! Yuborildi: ${result.sentCount}, Xatolik: ${result.failedCount}`);
      } else {
        onError(result.message || 'PDF testlarni tarqatishda xatolik');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'PDF testlarni yuborishda xatolik';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishResults = async () => {
    if (!testId || !selectedChannelId) {
      onError('Iltimos, test va kanalni tanlang');
      return;
    }

    try {
      setLoading(true);
      const result = await telegramService.publishTestResults(testId, selectedChannelId);
      
      if (result.success) {
        onSuccess("Test natijalari kanalga muvaffaqiyatli e'lon qilindi!");
      } else {
        onError(result.message || "Natijalarni e'lon qilishda xatolik");
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || "Natijalarni e'lon qilishda xatolik";
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleSendTestLink = async () => {
    if (!testId || !selectedChannelId) {
      onError('Iltimos, test va kanalni tanlang');
      return;
    }
    if (!shareUrl) {
      onError('Test linki topilmadi');
      return;
    }

    try {
      setLoading(true);
      const result = await telegramService.sendTestToChannel(testId, selectedChannelId, shareUrl);
      if (result?.success) {
        onSuccess("Test linki kanalga yuborildi");
      } else {
        onError(result?.message || 'Link yuborishda xatolik');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Linkni yuborishda xatolik';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Telegram Authentication */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>O'quvchi akkauntini bog'lash</span>
          </CardTitle>
          <CardDescription>
            O'quvchilar Telegram akkauntlarini bog'lab, shaxsiy testlarni avtomatik olishlari mumkin
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TelegramAuthWidget 
            onSuccess={(message) => {
              onSuccess(message || 'Telegram akkaunti muvaffaqiyatli bog\'landi!');
            }}
            onError={(error) => {
              onError(`Telegram orqali kirishda xatolik: ${error}`);
            }}
          />
          
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Qanday ishlaydi</AlertTitle>
            <AlertDescription>
              O'quvchilar yuqoridagi "Telegram bilan kirish" tugmasini bosib akkauntini bog'laydi.
              Bog'langandan so'ng, shaxsiy PDF testlarni oladi va javoblari avtomatik kuzatiladi.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Channel Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Kanal tanlash</span>
          </CardTitle>
          <CardDescription>
            Testlarni tarqatish uchun Telegram kanalini tanlang
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="channel-select">Kanalni tanlang</Label>
              <Select value={selectedChannelId} onValueChange={onChannelSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Kanal tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.chatId}>
                      <div className="flex items-center space-x-2">
                        <span>{telegramService.getChannelTypeIcon(channel.type)}</span>
                        <span>{telegramService.formatChannelName(channel)}</span>
                        {channel.center && (
                          <Badge variant="outline" className="ml-2">
                            {channel.center.name}
                          </Badge>
                        )}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedChannel && (
              <div className="p-3 border rounded-lg bg-muted/50">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-medium">
                      {telegramService.formatChannelName(selectedChannel)}
                    </p>
                    <p className="text-sm text-muted-foreground">
                      {selectedChannel.center?.name || 'Markaz biriktirilmagan'} • 
                      Holat: {selectedChannel.status}
                    </p>
                  </div>
                  <Badge variant={selectedChannel.status === 'active' ? 'default' : 'secondary'}>
                    {selectedChannel.status}
                  </Badge>
                </div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* PDF Test Distribution */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>PDF testlar</span>
          </CardTitle>
          <CardDescription>
            O'quvchilar uchun shaxsiy PDF testlar yaratib yuboring
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Shaxsiy variantlar</AlertTitle>
            <AlertDescription>
              Har bir o'quvchi aralashtirilgan savollar bilan alohida PDF oladi
            </AlertDescription>
          </Alert>

          <Button
            onClick={handleSendPDFTests}
            disabled={loading || !testId || !selectedChannelId}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <FileText className="h-4 w-4 mr-2" />
            )}
            PDFlarni yaratish va yuborish
          </Button>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Har bir o'quvchi uchun alohida PDF variant</p>
            <p>• Savollar aralashtiriladi (unikal test)</p>
            <p>• PDFlar o'quvchining shaxsiy chatiga yuboriladi</p>
          </div>
        </CardContent>
      </Card>

    {/* Weekly/manual printable link */}
    {shareUrl ? (
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="h-5 w-5" />
            <span>Test linki</span>
          </CardTitle>
          <CardDescription>Haftalik test uchun bitta printable HTML link</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="text-sm break-all rounded border p-3 bg-muted/50">{shareUrl}</div>
          <Button
            onClick={handleSendTestLink}
            disabled={loading || !testId || !selectedChannelId}
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Send className="h-4 w-4 mr-2" />
            )}
            Linkni kanalga yuborish
          </Button>
        </CardContent>
      </Card>
    ) : null}

      {/* Distribution Results */}
      {distributionResult && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              {distributionResult.success ? (
                <CheckCircle className="h-5 w-5 text-green-500" />
              ) : (
                <AlertCircle className="h-5 w-5 text-red-500" />
              )}
              <span>Tarqatish natijalari</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {distributionResult.sentCount}
                </div>
                <p className="text-sm text-muted-foreground">Muvaffaqiyatli yuborildi</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {distributionResult.failedCount}
                </div>
                <p className="text-sm text-muted-foreground">Xatolik</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">
                  {distributionResult.sentCount + distributionResult.failedCount}
                </div>
                <p className="text-sm text-muted-foreground">Jami o'quvchilar</p>
              </div>
            </div>

            {distributionResult.sentCount > 0 && (
              <Progress 
                value={(distributionResult.sentCount / (distributionResult.sentCount + distributionResult.failedCount)) * 100} 
                className="mb-4"
              />
            )}

            {distributionResult.details && distributionResult.details.length > 0 && (
              <div className="space-y-2">
                <Label>Batafsil natijalar:</Label>
                <div className="max-h-40 overflow-y-auto border rounded p-3 text-sm font-mono">
                  {distributionResult.details.map((detail, index) => (
                    <div key={index} className="py-1">
                      {detail}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </CardContent>
        </Card>
      )}

      {/* Results Publishing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Users className="h-5 w-5" />
            <span>Natijalarni boshqarish</span>
          </CardTitle>
          <CardDescription>
            Test natijalari va statistikani kanalga e'lon qilish
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button
            onClick={handlePublishResults}
            disabled={loading || !testId || !selectedChannelId}
            variant="outline"
            className="w-full"
          >
            {loading ? (
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
            ) : (
              <Download className="h-4 w-4 mr-2" />
            )}
            Natijalarni kanalga e'lon qilish
          </Button>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Umumiy test natijalarini e'lon qiladi</p>
            <p>• O'quvchilar natijalari bo'yicha qisqa xulosa</p>
            <p>• Yangi javoblar kelsa avtomatik yangilanadi</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramTestDistribution;
