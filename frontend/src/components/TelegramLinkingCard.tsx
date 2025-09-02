import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { request } from '@/configs/request';
import { Link, Users, UserPlus, Loader2, CheckCircle, AlertCircle } from 'lucide-react';

interface UnlinkedTelegramUser {
  id: number;
  telegramUserId: string;
  firstName?: string;
  lastName?: string;
  username?: string;
  createdAt: string;
}

interface LMSUser {
  id: number;
  firstName: string;
  lastName: string;
  email: string;
  role: string;
}

export default function TelegramLinkingCard() {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [unlinkedUsers, setUnlinkedUsers] = useState<UnlinkedTelegramUser[]>([]);
  const [lmsUsers, setLMSUsers] = useState<LMSUser[]>([]);
  const [selectedTelegramUser, setSelectedTelegramUser] = useState<string>('');
  const [selectedLMSUser, setSelectedLMSUser] = useState<string>('');
  const [linking, setLinking] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      
      // Load unlinked Telegram users
      const telegramRes = await request.get('/telegram/unlinked-users');
      setUnlinkedUsers(telegramRes.data || []);

      // Load LMS users (students and teachers who might not be linked)
      const usersRes = await request.get('/users');
      setLMSUsers(usersRes.data || []);
      
    } catch (error: any) {
      console.error('Error loading data:', error);
      toast({
        title: 'Xato',
        description: 'Ma\'lumotlarni yuklab olishda xatolik',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkUsers = async () => {
    if (!selectedTelegramUser || !selectedLMSUser) {
      toast({
        title: 'Xato',
        description: 'Iltimos, Telegram va LMS foydalanuvchilarini tanlang',
        variant: 'destructive'
      });
      return;
    }

    try {
      setLinking(true);
      
      await request.post(`/telegram/link/${selectedTelegramUser}/${selectedLMSUser}`);
      
      toast({
        title: 'Muvaffaqiyat',
        description: 'Foydalanuvchilar muvaffaqiyatli ulandi',
      });

      // Reset selections and reload data
      setSelectedTelegramUser('');
      setSelectedLMSUser('');
      await loadData();
      
    } catch (error: any) {
      console.error('Error linking users:', error);
      toast({
        title: 'Xato',
        description: error.response?.data?.message || 'Foydalanuvchilarni ulashda xatolik',
        variant: 'destructive'
      });
    } finally {
      setLinking(false);
    }
  };

  const getTelegramDisplayName = (user: UnlinkedTelegramUser) => {
    const name = [user.firstName, user.lastName].filter(Boolean).join(' ');
    const username = user.username ? `@${user.username}` : '';
    return `${name || 'Ism yo\'q'} ${username}`.trim() || user.telegramUserId;
  };

  const getLMSDisplayName = (user: LMSUser) => {
    return `${user.firstName} ${user.lastName} (${user.email})`;
  };

  if (loading) {
    return (
      <Card className="border-border">
        <CardHeader>
          <CardTitle className="text-card-foreground flex items-center">
            <Link className="h-5 w-5 mr-2" />
            Telegram Ulash
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin mr-2" />
            <span className="text-muted-foreground">Yuklanmoqda...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="border-border shadow-card hover:shadow-hover transition-all duration-500 hover:-translate-y-1 bg-gradient-card backdrop-blur-sm animate-slide-up">
      <CardHeader className="pb-4">
        <CardTitle className="text-card-foreground flex items-center">
          <div className="p-2 rounded-lg bg-gradient-primary mr-3">
            <Link className="h-5 w-5 text-white" />
          </div>
          <span className="bg-gradient-hero bg-clip-text text-transparent font-bold">
            Telegram Hisoblarini Ulash
          </span>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-6">
          {/* Statistics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-orange-50 border border-orange-200 rounded-lg">
              <div className="flex items-center">
                <AlertCircle className="h-8 w-8 text-orange-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-orange-700">{unlinkedUsers.length}</p>
                  <p className="text-sm text-orange-600">Ulanmagan Telegram</p>
                </div>
              </div>
            </div>
            <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center">
                <Users className="h-8 w-8 text-blue-500 mr-3" />
                <div>
                  <p className="text-2xl font-bold text-blue-700">{lmsUsers.length}</p>
                  <p className="text-sm text-blue-600">LMS Foydalanuvchilari</p>
                </div>
              </div>
            </div>
          </div>

          {unlinkedUsers.length > 0 ? (
            <>
              {/* Linking Interface */}
              <div className="space-y-4">
                <h3 className="font-semibold text-lg">Foydalanuvchilarni ulash</h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium">Telegram Foydalanuvchisi</label>
                    <Select 
                      value={selectedTelegramUser} 
                      onValueChange={setSelectedTelegramUser}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Telegram foydalanuvchisini tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {unlinkedUsers.map((user) => (
                          <SelectItem key={user.telegramUserId} value={user.telegramUserId}>
                            {getTelegramDisplayName(user)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>

                  <div className="space-y-2">
                    <label className="text-sm font-medium">LMS Foydalanuvchisi</label>
                    <Select 
                      value={selectedLMSUser} 
                      onValueChange={setSelectedLMSUser}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="LMS foydalanuvchisini tanlang" />
                      </SelectTrigger>
                      <SelectContent>
                        {lmsUsers.map((user) => (
                          <SelectItem key={user.id} value={user.id.toString()}>
                            {getLMSDisplayName(user)}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>

                <Button 
                  onClick={handleLinkUsers}
                  disabled={linking || !selectedTelegramUser || !selectedLMSUser}
                  className="w-full bg-gradient-primary hover:shadow-glow transition-all duration-300"
                >
                  {linking ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin mr-2" />
                      Ulanmoqda...
                    </>
                  ) : (
                    <>
                      <UserPlus className="h-4 w-4 mr-2" />
                      Foydalanuvchilarni ulash
                    </>
                  )}
                </Button>
              </div>

              {/* Unlinked Users List */}
              <div className="space-y-3">
                <h3 className="font-semibold text-lg">Ulanmagan Telegram Foydalanuvchilari</h3>
                <div className="space-y-2">
                  {unlinkedUsers.map((user, index) => (
                    <div 
                      key={user.telegramUserId}
                      className="flex items-center justify-between p-3 bg-gradient-subtle border border-border/50 rounded-lg animate-fade-in"
                      style={{ animationDelay: `${index * 50}ms` }}
                    >
                      <div className="flex items-center space-x-3">
                        <div className="p-2 bg-orange-100 rounded-full">
                          <AlertCircle className="h-4 w-4 text-orange-500" />
                        </div>
                        <div>
                          <p className="font-medium text-foreground">
                            {getTelegramDisplayName(user)}
                          </p>
                          <p className="text-sm text-muted-foreground">
                            ID: {user.telegramUserId} • {new Date(user.createdAt).toLocaleDateString('uz-UZ')}
                          </p>
                        </div>
                      </div>
                      <Badge variant="outline" className="text-orange-600 border-orange-300">
                        Ulanmagan
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            </>
          ) : (
            <div className="text-center py-8">
              <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
              <h3 className="text-lg font-semibold text-foreground mb-2">
                Hammasi ulandi!
              </h3>
              <p className="text-sm text-muted-foreground">
                Barcha Telegram foydalanuvchilari allaqachon LMS bilan ulangan
              </p>
            </div>
          )}

          {/* Instructions */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h4 className="font-medium text-blue-800 mb-2">Ko'rsatmalar:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>1. Studentlar @universal_lmsbot ga /start yoki /register yuborishi kerak</li>
              <li>2. Agar avtomatik ulanmasa, yuqorida qo'lda ulashingiz mumkin</li>
              <li>3. Ulangandan keyin studentlarga PDF va xabarlar avtomatik yuboriladi</li>
            </ul>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
