import React, { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import {request} from '@/configs/request';

interface TelegramChat {
  id: number;
  chatId: string;
  type: 'channel' | 'private' | 'group';
  title?: string;
  username?: string;
  status: 'active' | 'inactive' | 'blocked';
  lastActivity?: string;
  centerId?: number;
  centerName?: string;
  subjectId?: number;
  subjectName?: string;
  inviteLink?: string;
}

interface UnlinkedUser {
  id: number;
  telegramUserId: string;
  telegramUsername?: string;
  firstName?: string;
  lastName?: string;
  createdAt: string;
}

interface Test {
  id: number;
  title: string;
  subject: {
    id: number;
    name: string;
  };
  totalQuestions: number;
  centerId?: number;
  centerName?: string;
}

interface Center {
  id: number;
  name: string;
}

interface Subject {
  id: number;
  name: string;
}

const TelegramManagement: React.FC = () => {
  // Bot admin bo'lgan kanallar ro'yxati
  const [adminChannels, setAdminChannels] = useState<TelegramChat[]>([]);
  const [showAdminChannels, setShowAdminChannels] = useState(false);

  // Bot admin bo'lgan kanallarni olish
  const handleShowAdminChannels = async () => {
    setLoading(true);
    try {
      // Backendda bot admin bo'lgan kanallarni qaytaradigan endpoint bo'lishi kerak
      const response = await request.get('/telegram/admin-channels');
      setAdminChannels(response.data || []);
      setShowAdminChannels(true);
    } catch (error) {
      toast({
        title: 'Xato',
        description: 'Bot admin bo‘lgan kanallarni olishda xatolik',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };
  const { toast } = useToast();
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [unlinkedUsers, setUnlinkedUsers] = useState<UnlinkedUser[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [filterCenter, setFilterCenter] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  
  // User linking
  const [selectedUser, setSelectedUser] = useState<string>('');
  const [selectedTelegramUser, setSelectedTelegramUser] = useState<string>('');
  
  // New chat registration
  const [newChat, setNewChat] = useState({
    chatId: '',
    type: 'channel' as 'channel' | 'group' | 'private',
    title: '',
    username: '',
    centerId: '',
    subjectId: '',
  });

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Get current user from localStorage
      const userData = localStorage.getItem('EduOne_user');
      const user = userData ? JSON.parse(userData) : null;
      setCurrentUser(user);
      
      // Fetch all chats, available tests, centers, subjects, users, and unlinked users
      const [chatsResponse, testsResponse, centersResponse, subjectsResponse, usersResponse, unlinkedResponse] = await Promise.all([
        request.get('/telegram/chats'), // All chats for management
        request.get('/tests/my'), // Teacher's tests
        request.get('/centers'), // All centers
        request.get('/subjects'), // All subjects
        request.get('/users'), // All users for linking
        request.get('/telegram/unlinked-users'), // Unlinked Telegram users
      ]);

      setChats(chatsResponse.data || []);
      setTests(testsResponse.data || []);
      setCenters(centersResponse.data || []);
      setSubjects(subjectsResponse.data || []);
      setUsers(usersResponse.data || []);
      setUnlinkedUsers(unlinkedResponse.data || []);
      
      // Auto-select center if user has only one center OR use user's assigned center
      if (user?.center) {
        setNewChat(prev => ({
          ...prev,
          centerId: user.center.id.toString()
        }));
      } else if (centersResponse.data && centersResponse.data.length === 1) {
        setNewChat(prev => ({
          ...prev,
          centerId: centersResponse.data[0].id.toString()
        }));
      }
    } catch (error) {
      toast({
        title: 'Xato',
        description: 'Telegram ma\'lumotlarini yuklashda xatolik',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleRegisterChat = async () => {
    if (!newChat.chatId) {
      toast({
        title: 'Xato',
        description: 'Chat ID kiritish majburiy',
        variant: 'destructive',
      });
      return;
    }

    // Check if user has access to centers
    if (!currentUser?.center && centers.length === 0) {
      toast({
        title: 'Xato',
        description: 'Sizga markaz tayinlanmagan. Administratorga murojaat qiling.',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      
      // Convert string IDs to numbers, set to undefined if empty
      const chatData = {
        ...newChat,
        centerId: newChat.centerId ? parseInt(newChat.centerId) : undefined,
        subjectId: newChat.subjectId ? parseInt(newChat.subjectId) : undefined,
      };
      
      await request.post('/telegram/chats', chatData);
      
      toast({
        title: 'Muvaffaqiyat',
        description: 'Telegram chat muvaffaqiyatli ro\'yxatga olindi',
      });
      
      setNewChat({
        chatId: '',
        type: 'channel',
        title: '',
        username: '',
        centerId: '',
        subjectId: '',
      });
      
      fetchData();
    } catch (error) {
      toast({
        title: 'Xato',
        description: 'Telegram chatni ro\'yxatga olishda xatolik',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!selectedTest || !selectedChannel) {
      toast({
        title: 'Xato',
        description: 'Iltimos test va kanalni tanlang',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await request.post('/telegram/send-test', {
        testId: parseInt(selectedTest),
        channelId: selectedChannel,
        customMessage: customMessage || undefined,
      });
      
      toast({
        title: 'Muvaffaqiyat',
        description: 'Test Telegram kanaliga muvaffaqiyatli yuborildi',
      });
      
      setSelectedTest('');
      setSelectedChannel('');
      setCustomMessage('');
    } catch (error) {
      toast({
        title: 'Xato',
        description: 'Testni Telegram kanaliga yuborishda xatolik',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handlePublishResults = async (testId: number, channelId: string) => {
    try {
      setLoading(true);
      await request.post(`/telegram/publish-results/${testId}/${encodeURIComponent(channelId)}`);
      
      toast({
        title: 'Muvaffaqiyat',
        description: 'Natijalar kanalga e\'lon qilindi',
      });
    } catch (error) {
      toast({
        title: 'Xato',
        description: 'Natijalarni e\'lon qilishda xatolik',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLinkUser = async () => {
    if (!selectedUser || !selectedTelegramUser) {
      toast({
        title: 'Xato',
        description: 'Iltimos LMS va Telegram foydalanuvchisini tanlang',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      const response = await request.post('/telegram/link-telegram-user', {
        lmsUserId: parseInt(selectedUser),
        telegramUserId: selectedTelegramUser,
      });
      
      if (response.data.success) {
        toast({
          title: 'Muvaffaqiyat',
          description: response.data.message,
        });
        
        setSelectedUser('');
        setSelectedTelegramUser('');
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: response.data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Xato',
        description: 'Foydalanuvchilarni bog\'lashda xatolik',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleGenerateInviteLink = async (channelId: string) => {
    try {
      setLoading(true);
      const response = await request.post(`/telegram/generate-invite/${encodeURIComponent(channelId)}`);
      
      if (response.data.success) {
        toast({
          title: 'Muvaffaqiyat',
          description: 'Taklifnoma havolasi muvaffaqiyatli yaratildi',
        });
        
        // Copy to clipboard if available
        if (navigator.clipboard && response.data.inviteLink) {
          await navigator.clipboard.writeText(response.data.inviteLink);
          toast({
            title: 'Nusxalandi',
            description: 'Taklifnoma havolasi buferga nusxalandi',
          });
        }
        
        fetchData();
      } else {
        toast({
          title: 'Error',
          description: response.data.message,
          variant: 'destructive',
        });
      }
    } catch (error) {
      toast({
        title: 'Xato',
        description: 'Taklifnoma havolasini yaratishda xatolik',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const getChatTypeColor = (type: string) => {
    switch (type) {
      case 'channel': return 'bg-blue-100 text-blue-800';
      case 'group': return 'bg-green-100 text-green-800';
      case 'private': return 'bg-purple-100 text-purple-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getChatTypeText = (type: string) => {
    switch (type) {
      case 'channel': return 'Kanal';
      case 'group': return 'Guruh';
      case 'private': return 'Shaxsiy';
      default: return type;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'active': return 'Faol';
      case 'inactive': return 'Nofaol';
      case 'blocked': return 'Bloklangan';
      default: return status;
    }
  };

  // Filter chats based on center and subject
  const filteredChats = chats.filter(chat => {
    const centerMatch = filterCenter === 'all' || chat.centerId?.toString() === filterCenter;
    const subjectMatch = filterSubject === 'all' || chat.subjectId?.toString() === filterSubject;
    return centerMatch && subjectMatch;
  });

  // Filter tests based on center
  const filteredTests = tests.filter(test => {
    return filterCenter === 'all' || test.centerId?.toString() === filterCenter;
  });

  // Generate suggested channel name
  const generateChannelName = () => {
    const center = centers.find(c => c.id.toString() === newChat.centerId);
    const subject = subjects.find(s => s.id.toString() === newChat.subjectId);
    
    if (center && subject) {
      const centerName = center.name.toLowerCase().replace(/\s+/g, '');
      const subjectName = subject.name.toLowerCase().replace(/\s+/g, '');
      return `@universal_${centerName}_${subjectName}`;
    }
    return '';
  };

  return (
    <div className="space-y-6">
      {/* Bot admin bo'lgan kanallar ro'yxatini chiqarish knopkasi */}
      <div className="flex items-center gap-4">
        <Button onClick={handleShowAdminChannels} disabled={loading}>
          Bot admin bo'lgan kanallarni ko'rsatish
        </Button>
      </div>
      {showAdminChannels && (
        <Card className="mt-4">
          <CardHeader>
            <CardTitle>Bot admin bo'lgan kanallar ro'yxati</CardTitle>
          </CardHeader>
          <CardContent>
            {adminChannels.length === 0 ? (
              <p className="text-xs md:text-sm text-gray-500">Hech qanday kanal topilmadi.</p>
            ) : (
              <ul className="space-y-2">
                {adminChannels.map((channel) => (
                  <li key={channel.chatId} className="flex items-center gap-4">
                    <span className="font-semibold">{channel.title || channel.chatId}</span>
                    <span className="text-xs text-muted-foreground">ID: {channel.chatId}</span>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      )}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl md:text-3xl font-bold">Telegram Integratsiyasi</h1>
        <Button onClick={fetchData} disabled={loading}>
          {loading ? <span className="text-xs md:text-sm">Yuklanmoqda...</span> : <span className="text-xs md:text-sm">Yangilash</span>}
        </Button>
      </div>

      {/* Register New Chat */}
      <Card>
        <CardHeader>
          <CardTitle>Yangi Telegram Chat/Kanal ro'yxatga olish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="chatId">Chat ID *</Label>
              <Input
                id="chatId"
                placeholder="@channel_name or -1001234567890"
                value={newChat.chatId}
                onChange={(e) => setNewChat({ ...newChat, chatId: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="type">Turi</Label>
              <Select
                value={newChat.type}
                onValueChange={(value: 'channel' | 'group' | 'private') => 
                  setNewChat({ ...newChat, type: value })
                }
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="channel">Kanal</SelectItem>
                  <SelectItem value="group">Guruh</SelectItem>
                  <SelectItem value="private">Shaxsiy</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Sarlavha</Label>
              <Input
                id="title"
                placeholder="Kanal/Guruh nomi"
                value={newChat.title}
                onChange={(e) => setNewChat({ ...newChat, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="username">Foydalanuvchi nomi</Label>
              <Input
                id="username"
                placeholder="@username"
                value={newChat.username}
                onChange={(e) => setNewChat({ ...newChat, username: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="centerId">Markaz</Label>
              <Select
                value={newChat.centerId || undefined}
                onValueChange={(value) => setNewChat({ ...newChat, centerId: value || '' })}
                disabled={centers.length <= 1 || !!currentUser?.center} // Disable if user has assigned center or only one center
              >
                <SelectTrigger>
                  <SelectValue placeholder={
                    currentUser?.center ? currentUser.center.name :
                    centers.length === 1 ? centers[0].name : "Markazni tanlang"
                  } />
                </SelectTrigger>
                <SelectContent>
                  {centers.map((center) => (
                    <SelectItem key={center.id} value={center.id.toString()}>
                      {center.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {!currentUser?.center && centers.length === 0 && (
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Sizga markaz tayinlanmagan. Administratorga murojaat qiling.
                </p>
              )}
              {(currentUser?.center || centers.length === 1) && (
                <p className="text-xs md:text-sm text-muted-foreground mt-1">
                  Sizning markazingiz: {currentUser?.center?.name || centers[0]?.name}
                </p>
              )}
            </div>
            <div>
              <Label htmlFor="subjectId">Fan</Label>
              <Select
                value={newChat.subjectId || undefined}
                onValueChange={(value) => setNewChat({ ...newChat, subjectId: value || '' })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Fanni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Auto-generated suggestion */}
          {newChat.centerId && newChat.subjectId && (
            <div className="p-3 bg-blue-50 border border-blue-200 rounded-md">
              <p className="text-xs md:text-sm text-blue-700">
                <strong className="text-xs md:text-sm">Tavsiya etilgan kanal nomi:</strong> {generateChannelName()}
              </p>
            </div>
          )}
          
          <Button onClick={handleRegisterChat} disabled={loading}>
            Chatni ro'yxatga olish
          </Button>
        </CardContent>
      </Card>

      {/* User Linking */}
      <Card>
        <CardHeader>
          <CardTitle>Telegram foydalanuvchilarini LMS hisoblariga bog'lash</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {unlinkedUsers.length === 0 ? (
            <p className="text-xs md:text-sm text-gray-500 text-center py-4">
              Bog'lanmagan Telegram foydalanuvchilari yo'q. Foydalanuvchilar avval botni ishga tushirishlari kerak.
            </p>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="lmsUser">LMS foydalanuvchisini tanlang</Label>
                  <Select value={selectedUser} onValueChange={setSelectedUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="LMS foydalanuvchisini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {users.map((user) => (
                        <SelectItem key={user.id} value={user.id.toString()}>
                          {user.firstName} {user.lastName} ({user.username})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="telegramUser">Telegram foydalanuvchisini tanlang</Label>
                  <Select value={selectedTelegramUser} onValueChange={setSelectedTelegramUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Telegram foydalanuvchisini tanlang" />
                    </SelectTrigger>
                    <SelectContent>
                      {unlinkedUsers.map((user) => (
                        <SelectItem key={user.id} value={user.telegramUserId}>
                          {user.firstName} {user.lastName} (@{user.telegramUsername || 'no_username'})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              
              <Button 
                onClick={handleLinkUser} 
                disabled={loading || !selectedUser || !selectedTelegramUser}
              >
                Foydalanuvchilarni bog'lash
              </Button>
            </>
          )}
        </CardContent>
      </Card>

      {/* Send Test to Channel */}
      <Card>
        <CardHeader>
          <CardTitle>Testni Telegram kanaliga yuborish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="test">Testni tanlang</Label>
              <Select value={selectedTest} onValueChange={setSelectedTest}>
                <SelectTrigger>
                  <SelectValue placeholder="Testni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {tests.map((test) => (
                    <SelectItem key={test.id} value={test.id.toString()}>
                      {test.title} ({test.subject.name}) - {test.totalQuestions} savollar
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="channel">Kanalni tanlang</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Kanalni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  {chats.filter(chat => chat.type === 'channel').map((chat) => (
                    <SelectItem key={chat.id} value={chat.chatId}>
                      {chat.title || chat.chatId} ({chat.username || 'Foydalanuvchi nomi yo\'q'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="message">Maxsus xabar (Ixtiyoriy)</Label>
            <Textarea
              id="message"
              placeholder="Test bilan birga yuboriladigan maxsus xabar qo'shing..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleSendTest} disabled={loading || !selectedTest || !selectedChannel}>
            Testni kanalga yuborish
          </Button>
        </CardContent>
      </Card>

      {/* Registered Chats */}
      <Card>
        <CardHeader>
          <CardTitle>Ro'yxatga olingan Telegram chatlar</CardTitle>
          {/* Filter Controls */}
          <div className="flex gap-4 mt-4">
            {(centers.length > 1 && !currentUser?.center) && (
              <div className="w-48">
                <Label>Markaz bo'yicha filtrlash</Label>
                <Select value={filterCenter} onValueChange={setFilterCenter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Markazni tanlang" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">Barcha markazlar</SelectItem>
                    {centers.map((center) => (
                      <SelectItem key={center.id} value={center.id.toString()}>
                        {center.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="w-48">
              <Label>Fan bo'yicha filtrlash</Label>
              <Select value={filterSubject} onValueChange={setFilterSubject}>
                <SelectTrigger>
                  <SelectValue placeholder="Fanni tanlang" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">Barcha fanlar</SelectItem>
                  {subjects.map((subject) => (
                    <SelectItem key={subject.id} value={subject.id.toString()}>
                      {subject.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {filteredChats.length === 0 ? (
            <p className="text-xs md:text-sm text-gray-500 text-center py-4">Hech qanday Telegram chat hali ro'yxatga olinmagan.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredChats.map((chat) => (
                <div key={chat.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate">{chat.title || chat.chatId}</h3>
                    <Badge className={getStatusColor(chat.status)}>
                      {getStatusText(chat.status)}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getChatTypeColor(chat.type)}>
                      {getChatTypeText(chat.type)}
                    </Badge>
                    {chat.username && (
                      <span className="text-xs md:text-sm text-gray-500">{chat.username}</span>
                    )}
                  </div>
                  <p className="text-xs md:text-sm text-gray-500">
                    ID: {chat.chatId}
                  </p>
                  {chat.centerName && (
                    <p className="text-xs md:text-sm text-gray-600">
                      Markaz: {chat.centerName}
                    </p>
                  )}
                  {chat.subjectName && (
                    <p className="text-xs md:text-sm text-gray-600">
                      Fan: {chat.subjectName}
                    </p>
                  )}
                  {chat.lastActivity && (
                    <p className="text-xs md:text-sm text-gray-500">
                      Oxirgi faollik: {new Date(chat.lastActivity).toLocaleDateString()}
                    </p>
                  )}
                  
                  {chat.type === 'channel' && (
                    <div className="pt-2 space-y-2">
                      <hr />
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => handleGenerateInviteLink(chat.chatId)}
                          disabled={loading}
                        >
                          Taklifnoma havolasini yaratish
                        </Button>
                        
                        {chat.inviteLink && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => navigator.clipboard?.writeText(chat.inviteLink!)}
                          >
                            <span className="text-xs md:text-sm">Havolani nusxalash</span>
                          </Button>
                        )}
                      </div>
                      
                      {chat.inviteLink && (
                        <p className="text-xs md:text-sm text-gray-500 truncate">
                          {chat.inviteLink}
                        </p>
                      )}
                    </div>
                  )}
                  
                  {chat.type === 'channel' && tests.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <hr />
                      <p className="text-xs md:text-sm font-medium">Tezkor amallar:</p>
                      {tests.slice(0, 2).map((test) => (
                        <Button
                          key={test.id}
                          size="sm"
                          variant="outline"
                          className="w-full text-xs md:text-sm"
                          onClick={() => handlePublishResults(test.id, chat.chatId)}
                          disabled={loading}
                        >
                          Natijalarni e'lon qilish: {test.title}
                        </Button>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Instructions */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg md:text-2xl">Telegram integratsiyasidan qanday foydalanish</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold text-xs md:text-base">📤 O'qituvchilar uchun:</h4>
              <ul className="list-disc list-inside text-xs md:text-sm text-gray-600 space-y-1">
                <li>Yuqoridagi forma yordamida Telegram kanallaringizni ro'yxatga oling</li>
                <li>Testlarni talabalar ko'radigan kanallarga yuboring</li>
                <li>Javoblarni kuzating va natijalarni avtomatik e'lon qiling</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold text-xs md:text-base">📝 Talabalar uchun:</h4>
              <ul className="list-disc list-inside text-xs md:text-sm text-gray-600 space-y-1">
                <li>Testlarni ko'rish uchun sinf Telegram kanaliga qo'shiling</li>
                <li>Savollarga quyidagi formatda javob bering: <code className="bg-gray-100 px-1 rounded">#T123Q1 A</code></li>
                <li>Javoblaringizga darhol fikr-mulohaza oling</li>
                <li>E'lon qilinganida yakuniy natijalarni ko'ring</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold text-xs md:text-base">👨‍👩‍👧‍👦 Ota-onalar uchun:</h4>
              <ul className="list-disc list-inside text-xs md:text-sm text-gray-600 space-y-1">
                <li>Farzandingizning testlarini kuzatish uchun sinf kanallariga qo'shiling</li>
                <li>Test natijalarini va taraqqiyot yangiliklarini ko'ring</li>
                <li>Yangi topshiriqlar haqida xabardor bo'ling</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramManagement;