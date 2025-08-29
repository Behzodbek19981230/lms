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
  const { toast } = useToast();
  const [chats, setChats] = useState<TelegramChat[]>([]);
  const [tests, setTests] = useState<Test[]>([]);
  const [centers, setCenters] = useState<Center[]>([]);
  const [subjects, setSubjects] = useState<Subject[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedTest, setSelectedTest] = useState<string>('');
  const [selectedChannel, setSelectedChannel] = useState<string>('');
  const [customMessage, setCustomMessage] = useState<string>('');
  const [filterCenter, setFilterCenter] = useState<string>('all');
  const [filterSubject, setFilterSubject] = useState<string>('all');
  
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
      
      // Fetch user's chats, available tests, centers, and subjects
      const [chatsResponse, testsResponse, centersResponse, subjectsResponse] = await Promise.all([
        request.get('/telegram/chats/user/me'), // Assuming endpoint for current user
        request.get('/tests/my'), // Teacher's tests
        request.get('/centers'), // All centers
        request.get('/subjects'), // All subjects
      ]);

      setChats(chatsResponse.data || []);
      setTests(testsResponse.data || []);
      setCenters(centersResponse.data || []);
      setSubjects(subjectsResponse.data || []);
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to load Telegram data',
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
        title: 'Error',
        description: 'Chat ID is required',
        variant: 'destructive',
      });
      return;
    }

    try {
      setLoading(true);
      await request.post('/telegram/chats', newChat);
      
      toast({
        title: 'Success',
        description: 'Telegram chat registered successfully',
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
        title: 'Error',
        description: 'Failed to register Telegram chat',
        variant: 'destructive',
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSendTest = async () => {
    if (!selectedTest || !selectedChannel) {
      toast({
        title: 'Error',
        description: 'Please select both test and channel',
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
        title: 'Success',
        description: 'Test sent to Telegram channel successfully',
      });
      
      setSelectedTest('');
      setSelectedChannel('');
      setCustomMessage('');
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to send test to Telegram channel',
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
        title: 'Success',
        description: 'Results published to channel',
      });
    } catch (error) {
      toast({
        title: 'Error',
        description: 'Failed to publish results',
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

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return 'bg-green-100 text-green-800';
      case 'inactive': return 'bg-yellow-100 text-yellow-800';
      case 'blocked': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
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
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">Telegram Integration</h1>
        <Button onClick={fetchData} disabled={loading}>
          {loading ? 'Loading...' : 'Refresh'}
        </Button>
      </div>

      {/* Register New Chat */}
      <Card>
        <CardHeader>
          <CardTitle>Register New Telegram Chat/Channel</CardTitle>
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
              <Label htmlFor="type">Type</Label>
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
                  <SelectItem value="channel">Channel</SelectItem>
                  <SelectItem value="group">Group</SelectItem>
                  <SelectItem value="private">Private</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="title">Title</Label>
              <Input
                id="title"
                placeholder="Channel/Group title"
                value={newChat.title}
                onChange={(e) => setNewChat({ ...newChat, title: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="username">Username</Label>
              <Input
                id="username"
                placeholder="@username"
                value={newChat.username}
                onChange={(e) => setNewChat({ ...newChat, username: e.target.value })}
              />
            </div>
          </div>
          <Button onClick={handleRegisterChat} disabled={loading}>
            Register Chat
          </Button>
        </CardContent>
      </Card>

      {/* Send Test to Channel */}
      <Card>
        <CardHeader>
          <CardTitle>Send Test to Telegram Channel</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="test">Select Test</Label>
              <Select value={selectedTest} onValueChange={setSelectedTest}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a test" />
                </SelectTrigger>
                <SelectContent>
                  {tests.map((test) => (
                    <SelectItem key={test.id} value={test.id.toString()}>
                      {test.title} ({test.subject.name}) - {test.totalQuestions} questions
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="channel">Select Channel</Label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger>
                  <SelectValue placeholder="Choose a channel" />
                </SelectTrigger>
                <SelectContent>
                  {chats.filter(chat => chat.type === 'channel').map((chat) => (
                    <SelectItem key={chat.id} value={chat.chatId}>
                      {chat.title || chat.chatId} ({chat.username || 'No username'})
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <div>
            <Label htmlFor="message">Custom Message (Optional)</Label>
            <Textarea
              id="message"
              placeholder="Add a custom message to be sent with the test..."
              value={customMessage}
              onChange={(e) => setCustomMessage(e.target.value)}
              rows={3}
            />
          </div>
          <Button onClick={handleSendTest} disabled={loading || !selectedTest || !selectedChannel}>
            Send Test to Channel
          </Button>
        </CardContent>
      </Card>

      {/* Registered Chats */}
      <Card>
        <CardHeader>
          <CardTitle>Registered Telegram Chats</CardTitle>
        </CardHeader>
        <CardContent>
          {chats.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No Telegram chats registered yet.</p>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {chats.map((chat) => (
                <div key={chat.id} className="border rounded-lg p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <h3 className="font-semibold truncate">{chat.title || chat.chatId}</h3>
                    <Badge className={getStatusColor(chat.status)}>
                      {chat.status}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge className={getChatTypeColor(chat.type)}>
                      {chat.type}
                    </Badge>
                    {chat.username && (
                      <span className="text-sm text-gray-500">{chat.username}</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-500">
                    ID: {chat.chatId}
                  </p>
                  {chat.lastActivity && (
                    <p className="text-xs text-gray-500">
                      Last active: {new Date(chat.lastActivity).toLocaleDateString()}
                    </p>
                  )}
                  
                  {chat.type === 'channel' && tests.length > 0 && (
                    <div className="pt-2 space-y-2">
                      <hr />
                      <p className="text-xs font-medium">Quick Actions:</p>
                      {tests.slice(0, 2).map((test) => (
                        <Button
                          key={test.id}
                          size="sm"
                          variant="outline"
                          className="w-full text-xs"
                          onClick={() => handlePublishResults(test.id, chat.chatId)}
                          disabled={loading}
                        >
                          Publish Results: {test.title}
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
          <CardTitle>How to Use Telegram Integration</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div>
              <h4 className="font-semibold">📤 For Teachers:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Register your Telegram channels using the form above</li>
                <li>Send tests to channels where students can see them</li>
                <li>Monitor answers and publish results automatically</li>
              </ul>
            </div>
            
            <div>
              <h4 className="font-semibold">📝 For Students:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Join the class Telegram channel to see tests</li>
                <li>Answer questions using format: <code className="bg-gray-100 px-1 rounded">#T123Q1 A</code></li>
                <li>Get immediate feedback on your answers</li>
                <li>See final results when published</li>
              </ul>
            </div>

            <div>
              <h4 className="font-semibold">👨‍👩‍👧‍👦 For Parents:</h4>
              <ul className="list-disc list-inside text-sm text-gray-600 space-y-1">
                <li>Join class channels to monitor your child's tests</li>
                <li>View test results and progress updates</li>
                <li>Stay informed about new assignments</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default TelegramManagement;