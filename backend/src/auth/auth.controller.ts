import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiBody, ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { AuthService } from './auth.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { AuthResponseDto } from './dto/auth-response.dto';

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
  @ApiResponse({ status: 401, description: "Email yoki parol noto'g'ri" })
  @ApiBody({ type: LoginDto }) // 🔥 Majburiy qilamiz
  async login(@Body() loginDto: LoginDto): Promise<AuthResponseDto> {
    console.log('Logging in user:', loginDto);
    return this.authService.login(loginDto);
  }
}
