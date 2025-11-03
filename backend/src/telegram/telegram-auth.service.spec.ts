import {
  TelegramChat,
  ChatType,
  ChatStatus,
} from './entities/telegram-chat.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';
import { TelegramService } from './telegram.service';
import { TelegramAuthService } from './telegram-auth.service';
import { Test, TestingModule } from '@nestjs/testing';
import { getRepositoryToken } from '@nestjs/typeorm';

describe('TelegramAuthService', () => {
  let service: TelegramAuthService;

  const mockTelegramChatRepo = {
    findOne: jest.fn(),
    create: jest.fn(),
    save: jest.fn(),
    find: jest.fn(),
  };

  const mockUserRepo = {
    findOne: jest.fn(),
  };

  const mockCenterRepo = {
    findOne: jest.fn(),
  };

  const mockTelegramService = {
    sendAllPendingPdfs: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        TelegramAuthService,
        {
          provide: getRepositoryToken(TelegramChat),
          useValue: mockTelegramChatRepo,
        },
        {
          provide: getRepositoryToken(User),
          useValue: mockUserRepo,
        },
        {
          provide: getRepositoryToken(Center),
          useValue: mockCenterRepo,
        },
        {
          provide: TelegramService,
          useValue: mockTelegramService,
        },
      ],
    }).compile();

    service = module.get<TelegramAuthService>(TelegramAuthService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('connectUserToTelegram', () => {
    it('should connect a student user to Telegram and return success', async () => {
      const userId = 1;
      const authData = {
        telegramUserId: '123456789',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        authDate: 1234567890,
        hash: 'testhash',
      };

      const mockUser = {
        id: userId,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.STUDENT,
        center: { id: 1, name: 'Test Center' },
      };

      const mockTelegramChat = {
        id: 1,
        chatId: '123456789',
        type: ChatType.PRIVATE,
        status: ChatStatus.ACTIVE,
        telegramUserId: '123456789',
        telegramUsername: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        user: mockUser,
        center: mockUser.center,
      };

      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockTelegramChatRepo.findOne.mockResolvedValue(null);
      mockTelegramChatRepo.create.mockReturnValue(mockTelegramChat);
      mockTelegramChatRepo.save.mockResolvedValue(mockTelegramChat);
      mockTelegramService.sendAllPendingPdfs.mockResolvedValue({ sent: 0 });

      const result = await service.connectUserToTelegram(userId, authData);

      expect(result.success).toBe(true);
      expect(result.message).toContain(
        'Telegram hisobingiz muvaffaqiyatli ulandi',
      );
      expect(mockUserRepo.findOne).toHaveBeenCalledWith({
        where: { id: userId },
        relations: ['center', 'subjects', 'groups'],
      });
    });

    it('should return error if user not found', async () => {
      const userId = 1;
      const authData = {
        telegramUserId: '123456789',
        username: 'testuser',
        firstName: 'Test',
        lastName: 'User',
        authDate: 1234567890,
        hash: 'testhash',
      };

      mockUserRepo.findOne.mockResolvedValue(null);

      const result = await service.connectUserToTelegram(userId, authData);

      expect(result.success).toBe(false);
      expect(result.message).toBe('Foydalanuvchi topilmadi');
    });
  });

  describe('getUserTelegramStatus', () => {
    it('should return user telegram status with available channels for student', async () => {
      const userId = 1;

      const mockUserChat = {
        id: 1,
        telegramUserId: '123456789',
        telegramUsername: 'testuser',
        firstName: 'Test',
        lastName: 'User',
      };

      const mockUser = {
        id: userId,
        firstName: 'Test',
        lastName: 'User',
        role: UserRole.STUDENT,
        center: { id: 1, name: 'Test Center' },
        groups: [{ id: 1, name: 'Test Group' }],
        subjects: [{ id: 1, name: 'Test Subject' }],
      };

      const mockChannels = [
        {
          id: 1,
          chatId: '-1001234567890',
          type: ChatType.CHANNEL,
          status: ChatStatus.ACTIVE,
          title: 'Test Group Channel',
          group: { id: 1, name: 'Test Group' },
          subject: null,
          center: null,
        },
      ];

      mockTelegramChatRepo.findOne.mockResolvedValue(mockUserChat);
      mockUserRepo.findOne.mockResolvedValue(mockUser);
      mockTelegramChatRepo.find.mockResolvedValue(mockChannels);

      const result = await service.getUserTelegramStatus(userId);

      expect(result.isLinked).toBe(true);
      expect(result.telegramUsername).toBe('testuser');
      expect(result.availableChannels).toHaveLength(1);
      expect(result.availableChannels[0].groupName).toBe('Test Group');
    });
  });
});
