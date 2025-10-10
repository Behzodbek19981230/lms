import {
  ConflictException,
  Injectable,
  UnauthorizedException,
  BadRequestException,
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcryptjs';
import { User, UserRole } from '../users/entities/user.entity';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { InjectRepository } from '@nestjs/typeorm';
import {
  TelegramChat,
  ChatType,
  ChatStatus,
} from '../telegram/entities/telegram-chat.entity';
import {
  TelegramAuthDto,
  TelegramLoginDto,
  TelegramRegisterDto,
} from './dto/telegram-auth.dto';
import { ChangePasswordDto } from './dto/change-password.dto';

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
    const { username, password, firstName, lastName, phone, role } =
      registerDto;

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

    // Get user with center relationship
    const userWithCenter = await this.userRepository.findOne({
      where: { id: savedUser.id },
      relations: ['center', 'subjects'],
    });

    return {
      access_token,
      user: {
        id: userWithCenter!.id,
        username: userWithCenter!.username,
        firstName: userWithCenter!.firstName,
        lastName: userWithCenter!.lastName,
        fullName:
          userWithCenter!.firstName + ' ' + (userWithCenter!.lastName || ''),
        role: userWithCenter!.role,
      },
    };
  }

  async login(loginDto: LoginDto): Promise<AuthResponseDto> {
    const { username, password } = loginDto;

    const user = await this.userRepository.findOne({
      where: { username },
      relations: ['subjects', 'center'],
    });

    if (!user) {
      throw new BadRequestException("Foydalanuvchi nomi yoki parol noto'g'ri");
    }

    const isPasswordValid = await bcrypt.compare(password, user.password);
    if (!isPasswordValid) {
      throw new BadRequestException("Foydalanuvchi nomi yoki parol noto'g'ri");
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
      throw new BadRequestException('Foydalanuvchi topilmadi');
    }

    return {
      access_token,
      user: {
        id: userData.id,
        username: userData.username,
        firstName: userData.firstName,
        lastName: userData.lastName,
        fullName: userData.firstName + ' ' + (userData.lastName || ''),
        role: userData.role,
        hasCenterAssigned: !!userData.center,
        needsCenterAssignment: !userData.center,
        center: userData.center
          ? {
              id: userData.center.id,
              name: userData.center.name,
            }
          : null,
      },
    };
  }

  async validateUser(userId: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['subjects', 'center'],
    });

    if (!user || !user.isActive) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi yoki faol emas');
    }

    return user;
  }

  async telegramAuth(
    telegramAuthDto: TelegramAuthDto,
  ): Promise<AuthResponseDto> {
    const { telegramUserId } = telegramAuthDto;

    // Find existing telegram chat to link with user
    const telegramChat = await this.telegramChatRepository.findOne({
      where: { telegramUserId },
      relations: ['user'],
    });

    if (!telegramChat || !telegramChat.user) {
      throw new UnauthorizedException(
        "Telegram hisobi LMS foydalanuvchisi bilan bog'lanmagan",
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

  async telegramLogin(
    telegramLoginDto: TelegramLoginDto,
  ): Promise<AuthResponseDto> {
    const { telegramUserId } = telegramLoginDto;

    // Find telegram chat linked to user
    const telegramChat = await this.telegramChatRepository.findOne({
      where: { telegramUserId },
      relations: ['user'],
    });

    if (!telegramChat || !telegramChat.user) {
      throw new UnauthorizedException(
        "Telegram hisobi LMS foydalanuvchisi bilan bog'lanmagan",
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

  async telegramRegister(
    telegramRegisterDto: TelegramRegisterDto,
  ): Promise<AuthResponseDto> {
    const { telegramUserId, telegramUsername, firstName, lastName } =
      telegramRegisterDto;

    // Check if telegram user already exists
    const existingTelegramChat = await this.telegramChatRepository.findOne({
      where: { telegramUserId },
      relations: ['user'],
    });

    if (existingTelegramChat && existingTelegramChat.user) {
      throw new ConflictException(
        "Bu Telegram hisobi allaqachon boshqa foydalanuvchi bilan bog'langan",
      );
    }

    // Check if username already exists
    const existingUser = await this.userRepository.findOne({
      where: { username: telegramUsername },
    });

    if (existingUser) {
      throw new ConflictException('Bu foydalanuvchi nomi allaqachon band');
    }

    // Use default password for Telegram users
    const hashedPassword = await bcrypt.hash('lms1234', 12);

    // Create new user with telegram username
    const user = this.userRepository.create({
      username: telegramUsername,
      password: hashedPassword,
      firstName,
      lastName,
      role: UserRole.STUDENT, // Default role for telegram registration
      isActive: true,
      telegramConnected: true,
      telegramId: telegramUserId,
    });

    const savedUser = await this.userRepository.save(user);

    // Create or update telegram chat
    let telegramChat;
    if (existingTelegramChat) {
      existingTelegramChat.user = savedUser;
      existingTelegramChat.firstName = firstName;
      existingTelegramChat.lastName = lastName || '';
      existingTelegramChat.telegramUsername = telegramUsername;
      telegramChat =
        await this.telegramChatRepository.save(existingTelegramChat);
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

  async changePassword(
    userId: number,
    changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    const { currentPassword, newPassword, confirmPassword } = changePasswordDto;

    // Check if new password and confirm password match
    if (newPassword !== confirmPassword) {
      throw new BadRequestException(
        'Yangi parol va tasdiqlash paroli mos kelmaydi',
      );
    }

    // Find user
    const user = await this.userRepository.findOne({
      where: { id: userId },
    });

    if (!user) {
      throw new UnauthorizedException('Foydalanuvchi topilmadi');
    }

    // Verify current password
    const isCurrentPasswordValid = await bcrypt.compare(
      currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException("Joriy parol noto'g'ri");
    }

    // Hash new password
    const hashedNewPassword = await bcrypt.hash(newPassword, 12);

    // Update user password
    user.password = hashedNewPassword;
    await this.userRepository.save(user);

    return {
      message: "Parol muvaffaqiyatli o'zgartirildi",
    };
  }
}
