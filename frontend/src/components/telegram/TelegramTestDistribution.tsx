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
  Loader2
} from 'lucide-react';

import { telegramService } from '@/services/telegram.service';
import { TelegramChat, PDFDistributionResult, ChatType } from '@/types/telegram.type';
import TelegramAuthWidget from './TelegramAuthWidget';

interface TelegramTestDistributionProps {
  testId?: number;
  channels: TelegramChat[];
  selectedChannelId: string;
  onChannelSelect: (channelId: string) => void;
  onSuccess: (message: string) => void;
  onError: (error: string) => void;
}

const TelegramTestDistribution: React.FC<TelegramTestDistributionProps> = ({
  testId,
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
      onError('Please select a test and channel');
      return;
    }

    try {
      setLoading(true);
      const result = await telegramService.sendTestPDFsToChannel(testId, selectedChannelId);
      
      setDistributionResult(result);
      
      if (result.success) {
        onSuccess(`PDF tests distributed successfully! Sent: ${result.sentCount}, Failed: ${result.failedCount}`);
      } else {
        onError(result.message || 'Failed to distribute PDF tests');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to send PDF tests';
      onError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handlePublishResults = async () => {
    if (!testId || !selectedChannelId) {
      onError('Please select a test and channel');
      return;
    }

    try {
      setLoading(true);
      const result = await telegramService.publishTestResults(testId, selectedChannelId);
      
      if (result.success) {
        onSuccess('Test results published to channel successfully!');
      } else {
        onError(result.message || 'Failed to publish results');
      }
    } catch (error: any) {
      const errorMessage = error?.response?.data?.message || 'Failed to publish results';
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
            <span>Student Account Linking</span>
          </CardTitle>
          <CardDescription>
            Students can link their Telegram accounts to automatically receive personalized tests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <TelegramAuthWidget 
            onAuthSuccess={(data) => {
              onSuccess(`User ${data.first_name} successfully linked their Telegram account!`);
            }}
            onAuthError={(error) => {
              onError(`Telegram authentication failed: ${error}`);
            }}
          />
          
          <Alert className="mt-4">
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>How it works</AlertTitle>
            <AlertDescription>
              Students click the "Login with Telegram" button above to link their accounts. 
              Once linked, they can receive personalized PDF tests and their answers will be automatically tracked.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>

      {/* Channel Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <MessageSquare className="h-5 w-5" />
            <span>Channel Selection</span>
          </CardTitle>
          <CardDescription>
            Choose the Telegram channel for test distribution
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="grid w-full items-center gap-1.5">
              <Label htmlFor="channel-select">Select Channel</Label>
              <Select value={selectedChannelId} onValueChange={onChannelSelect}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a channel" />
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
                      {selectedChannel.center?.name || 'No center assigned'} • 
                      Status: {selectedChannel.status}
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
            <span>PDF Tests</span>
          </CardTitle>
          <CardDescription>
            Generate and send personalized PDF tests to students
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Individual Variants</AlertTitle>
            <AlertDescription>
              Each student will receive a unique PDF with shuffled questions
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
            Generate & Send PDFs
          </Button>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Individual PDF variants for each student</p>
            <p>• Questions are shuffled for unique tests</p>
            <p>• PDFs sent directly to students' private chats</p>
          </div>
        </CardContent>
      </Card>

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
              <span>Distribution Results</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-green-600">
                  {distributionResult.sentCount}
                </div>
                <p className="text-sm text-muted-foreground">Successfully Sent</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold text-red-600">
                  {distributionResult.failedCount}
                </div>
                <p className="text-sm text-muted-foreground">Failed</p>
              </div>
              <div className="text-center p-3 border rounded-lg">
                <div className="text-2xl font-bold">
                  {distributionResult.sentCount + distributionResult.failedCount}
                </div>
                <p className="text-sm text-muted-foreground">Total Students</p>
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
                <Label>Detailed Results:</Label>
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
            <span>Results Management</span>
          </CardTitle>
          <CardDescription>
            Publish test results and statistics to the channel
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
            Publish Results to Channel
          </Button>

          <div className="text-sm text-muted-foreground space-y-1">
            <p>• Publishes aggregated test results</p>
            <p>• Shows student performance summary</p>
            <p>• Updates automatically when new answers arrive</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramTestDistribution;
