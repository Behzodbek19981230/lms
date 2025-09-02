import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';
import { TelegramAuthDto, TelegramLoginDto } from './dto/telegram-auth.dto';

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
  @ApiResponse({ status: 401, description: "Foydalanuvchi nomi yoki parol noto'g'ri" })
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
  @ApiResponse({ status: 401, description: 'Telegram hisobi bog\'lanmagan' })
  @ApiBody({ type: TelegramLoginDto })
  async telegramLogin(@Body() telegramLoginDto: TelegramLoginDto): Promise<AuthResponseDto> {
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
  @ApiResponse({ status: 401, description: 'Telegram hisobi bog\'lanmagan' })
  @ApiBody({ type: TelegramAuthDto })
  async telegramAuth(@Body() telegramAuthDto: TelegramAuthDto): Promise<AuthResponseDto> {
    return this.authService.telegramAuth(telegramAuthDto);
  }
}
