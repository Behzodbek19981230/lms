import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import { TelegramChat, ChatType, ChatStatus } from '../telegram/entities/telegram-chat.entity';
import { TelegramAuthDto, TelegramLoginDto, TelegramRegisterDto } from './dto/telegram-auth.dto';

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    
    @InjectRepository(TelegramChat)
    private readonly telegramChatRepository: Repository<TelegramChat>,

    private readonly jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterDto): Promise<AuthResponseDto> {
    const { username, password, firstName, lastName, phone, role } = registerDto;

    const existingUser = await this.userRepository.findOne({
      where: { username },
    });

    if (existingUser) {
      throw new ConflictException(
        "Bu foydalanuvchi nomi allaqachon ro'yxatdan o'tgan",
      );
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const user = this.userRepository.create({
      username,
      password: hashedPassword,
      firstName,
      lastName,
      phone,
      role,
    });

    const savedUser = await this.userRepository.save(user);

    const payload = {
      sub: savedUser.id,
      username: savedUser.username,
      role: savedUser.role,
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: savedUser.id,
        username: savedUser.username,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        fullName: savedUser.firstName + ' ' + savedUser.lastName,
        role: savedUser.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['subjects'],
    });

    if (!user) {
      throw new UnauthorizedException("Foydalanuvchi nomi yoki parol noto'g'ri");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException("Foydalanuvchi nomi yoki parol noto'g'ri");
    }

    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const payload = { sub: user.id, username: user.username, role: user.role };
    const access_token = this.jwtService.sign(payload);
    const userData = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['subjects', 'center'],
    });
    if (!userData) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    return {
      access_token,
      user: userData,
    };
  }

  async validateUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['subjects'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi yoki faol emas');
    }

    return user;
  }

  async telegramAuth(telegramAuthDto: TelegramAuthDto): Promise<AuthResponseDto> {
    const { telegramUserId, telegramUsername, firstName, lastName } = telegramAuthDto;

    // Find existing telegram chat to link with user
    const telegramChat = await this.telegramChatRepository.findOne({
      where: { telegramUserId },
      relations: ['user'],
    });

    if (!telegramChat || !telegramChat.user) {
      throw new UnauthorizedException(
        'Telegram hisobi LMS foydalanuvchisi bilan bog\'lanmagan',
      );
    }

    const user = telegramChat.user;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const payload = { sub: user.id, username: user.username, role: user.role };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: user.id,
        username: user.username,
        firstName: user.firstName,
        lastName: user.lastName,
        fullName: user.fullName,
        role: user.role,
      },
    };
  }

  async telegramLogin(telegramLoginDto: TelegramLoginDto): Promise<AuthResponseDto> {
    const { telegramUserId } = telegramLoginDto;

    // Find telegram chat linked to user
    const telegramChat = await this.telegramChatRepository.findOne({
      where: { telegramUserId },
      relations: ['user'],
    });

    if (!telegramChat || !telegramChat.user) {
      throw new UnauthorizedException(
        'Telegram hisobi LMS foydalanuvchisi bilan bog\'lanmagan',
      );
    }

    const user = telegramChat.user;
    user.lastLoginAt = new Date();
    await this.userRepository.save(user);

    const payload = { sub: user.id, username: user.username, role: user.role };
    const access_token = this.jwtService.sign(payload);

    const userData = await this.userRepository.findOne({
      where: { id: user.id },
      relations: ['subjects', 'center'],
    });
    if (!userData) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    return {
      access_token,
      user: {
        id: userData.id,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: userData.fullName,
        role: userData.role,
      },
    };
  }

  async telegramRegister(telegramRegisterDto: TelegramRegisterDto): Promise<AuthResponseDto> {
    const { telegramUserId, telegramUsername, firstName, lastName } = telegramRegisterDto;

    // Check if telegram user already exists
    const existingTelegramChat = await this.telegramChatRepository.findOne({
      where: { telegramUserId },
      relations: ['user'],
    });

    if (existingTelegramChat && existingTelegramChat.user) {
      throw new ConflictException(
        'Bu Telegram hisobi allaqachon boshqa foydalanuvchi bilan bog\'langan',
      );
    }

    // Check if username already exists
    const existingUser = await this.userRepository.findOne({
      where: { username: telegramUsername },
    });

    if (existingUser) {
      throw new ConflictException(
        'Bu foydalanuvchi nomi allaqachon band',
      );
    }

    // Generate a secure random password for Telegram users
    const hashedPassword = await bcrypt.hash(
      `telegram_${telegramUserId}_${Date.now()}`,
      12
    );

    // Create new user with telegram username
    const user = this.userRepository.create({
      username: telegramUsername,
      password: hashedPassword,
      firstName,
      lastName,
      role: UserRole.STUDENT, // Default role for telegram registration
      isActive: true,
    });

    const savedUser = await this.userRepository.save(user);

    // Create or update telegram chat
    let telegramChat;
    if (existingTelegramChat) {
      existingTelegramChat.user = savedUser;
      existingTelegramChat.firstName = firstName;
      existingTelegramChat.lastName = lastName || '';
      existingTelegramChat.telegramUsername = telegramUsername;
      telegramChat = await this.telegramChatRepository.save(existingTelegramChat);
    } else {
      telegramChat = this.telegramChatRepository.create({
        chatId: telegramUserId,
        type: ChatType.PRIVATE,
        telegramUserId,
        telegramUsername,
        firstName,
        lastName,
        status: ChatStatus.ACTIVE,
        user: savedUser,
        lastActivity: new Date(),
      });
      await this.telegramChatRepository.save(telegramChat);
    }

    // Generate JWT token
    const payload = {
      sub: savedUser.id,
      username: savedUser.username,
      role: savedUser.role,
    };
    const access_token = this.jwtService.sign(payload);

    return {
      access_token,
      user: {
        id: savedUser.id,
        username: savedUser.username,
        firstName: savedUser.firstName,
        lastName: savedUser.lastName,
        fullName: savedUser.firstName + ' ' + (savedUser.lastName || ''),
        role: savedUser.role,
      },
    };
  }
}
