import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Post,
  Patch,
  UseGuards,
  Req,
} from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import {
  TelegramAuthDto,
  TelegramLoginDto,
  TelegramRegisterDto,
} from './dto/telegram-auth.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';

@ApiTags('Authentication')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('register')
  @ApiOperation({ summary: "O'qituvchi ro'yxatdan o'tish" })
  @ApiResponse({
    status: 201,
    description: "Muvaffaqiyatli ro'yxatdan o'tdi",
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 409, description: 'Email allaqachon mavjud' })
  @ApiBody({ type: RegisterDto }) // 🔥 Majburiy qilamiz
  async register(@Body() registerDto: RegisterDto): Promise<AuthResponseDto> {
    return this.authService.register(registerDto);
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "O'qituvchi tizimga kirish" })
  @ApiResponse({
    status: 200,
    description: 'Muvaffaqiyatli tizimga kirdi',
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 400,
    description: "Foydalanuvchi nomi yoki parol noto'g'ri",
  })
  @ApiBody({ type: LoginDto })
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    return this.authService.login(loginDto);
  }

  @Post('telegram/login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram orqali tizimga kirish' })
  @ApiResponse({
    status: 200,
    description: 'Muvaffaqiyatli Telegram orqali tizimga kirdi',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Telegram hisobi bog'lanmagan" })
  @ApiBody({ type: TelegramLoginDto })
  async telegramLogin(
    @Body() telegramLoginDto: TelegramLoginDto,
  ): Promise<AuthResponseDto> {
    return this.authService.telegramLogin(telegramLoginDto);
  }

  @Post('telegram/auth')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Telegram hisobini tasdiqlash' })
  @ApiResponse({
    status: 200,
    description: 'Muvaffaqiyatli Telegram hisobi tasdiqlandi',
    type: AuthResponseDto,
  })
  @ApiResponse({ status: 401, description: "Telegram hisobi bog'lanmagan" })
  @ApiBody({ type: TelegramAuthDto })
  async telegramAuth(
    @Body() telegramAuthDto: TelegramAuthDto,
  ): Promise<AuthResponseDto> {
    return this.authService.telegramAuth(telegramAuthDto);
  }

  @Post('telegram/register')
  @ApiOperation({ summary: "Telegram orqali ro'yxatdan o'tish" })
  @ApiResponse({
    status: 201,
    description: "Muvaffaqiyatli Telegram orqali ro'yxatdan o'tdi",
    type: AuthResponseDto,
  })
  @ApiResponse({
    status: 409,
    description: "Telegram hisobi allaqachon bog'langan",
  })
  @ApiBody({ type: TelegramRegisterDto })
  async telegramRegister(
    @Body() telegramRegisterDto: TelegramRegisterDto,
  ): Promise<AuthResponseDto> {
    return this.authService.telegramRegister(telegramRegisterDto);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: "Parolni o'zgartirish" })
  @ApiResponse({
    status: 200,
    description: "Parol muvaffaqiyatli o'zgartirildi",
    schema: {
      type: 'object',
      properties: {
        message: {
          type: 'string',
          example: "Parol muvaffaqiyatli o'zgartirildi",
        },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Parollar mos kelmaydi' })
  @ApiResponse({
    status: 401,
    description: "Joriy parol noto'g'ri yoki foydalanuvchi topilmadi",
  })
  @ApiBody({ type: ChangePasswordDto })
  async changePassword(
    @Req() req: any,
    @Body() changePasswordDto: ChangePasswordDto,
  ): Promise<{ message: string }> {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }
}
