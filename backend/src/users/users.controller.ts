import {
  Body,
  Controller,
  Get,
  Param,
  Patch,
  Post,
  Query,
  Request,
  UseGuards,
  BadRequestException,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guard';
import { UsersService } from './users.service';
import { User, UserRole } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { Roles } from 'src/auth/decorators/roles.decorator';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN)
  async createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    return this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });
  }

  @Post('centers/:centerId/admin')
  @Roles(UserRole.SUPERADMIN)
  async createCenterAdmin(
    @Param('centerId') centerId: string,
    @Body() dto: CreateUserDto,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    return this.usersService.create({
      ...dto,
      password: hashedPassword,
      role: UserRole.ADMIN,
      centerId: Number(centerId),
    } as CreateUserDto);
  }

  @Post('centers/:centerId/members')
  @Roles(UserRole.ADMIN)
  async createCenterMember(
    @Param('centerId') centerId: string,
    @Body() dto: CreateUserDto,
    @Request() req,
  ): Promise<User> {
    // Force the centerId to the admin's center
    const hashedPassword = await bcrypt.hash(dto.password, 12);
    const currentUser = req.user as { center?: { id?: number } | null };
    return this.usersService.create({
      ...dto,
      password: hashedPassword,
      centerId: Number(centerId) || (currentUser.center?.id ?? undefined),
    } as CreateUserDto);
  }

  @Post('members')
  @Roles(UserRole.ADMIN)
  async createMemberInMyCenter(
    @Body() dto: CreateUserDto,
    @Request() req,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    // Fetch fresh admin with center to avoid missing center in token payload
    const currentUser = req.user as { id: number };
    const me = await this.usersService.findOne(Number(currentUser.id));

    if (!me.center?.id) {
      throw new BadRequestException(
        "Admin foydalanuvchisi hech qanday markazga bog'lanmagan",
      );
    }

    return this.usersService.create({
      ...dto,
      password: hashedPassword,
      centerId: me.center.id,
    } as CreateUserDto);
  }

  @Post('students')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  async createStudent(
    @Body() dto: CreateUserDto,
    @Request() req,
  ): Promise<User> {
    const hashedPassword = await bcrypt.hash(dto.password, 12);

    const currentUser = req.user as { id: number; role: UserRole };
    const me = await this.usersService.findOne(Number(currentUser.id));

    // Teacher/Admin: force centerId to own center
    if (me.role === UserRole.TEACHER || me.role === UserRole.ADMIN) {
      if (!me.center?.id) {
        throw new BadRequestException("Foydalanuvchiga markaz biriktirilmagan");
      }
      return this.usersService.create({
        ...dto,
        password: hashedPassword,
        role: UserRole.STUDENT,
        centerId: me.center.id,
      } as CreateUserDto);
    }

    // Superadmin: allow specifying centerId in body
    if (me.role === UserRole.SUPERADMIN) {
      if (!dto.centerId) {
        throw new BadRequestException("Student yaratish uchun centerId majburiy");
      }
      return this.usersService.create({
        ...dto,
        password: hashedPassword,
        role: UserRole.STUDENT,
        centerId: Number(dto.centerId),
      } as CreateUserDto);
    }

    throw new BadRequestException("Ruxsat yo'q");
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get users list with optional filters' })
  @ApiResponse({ status: 200, description: 'Users list' })
  async getUsers(
    @Query('role') role?: UserRole,
    @Query('includeSubjects') includeSubjects?: string,
    @Query('includeGroups') includeGroups?: string,
    @Query('unassigned') unassigned?: string,
    @Request() req?,
  ) {
    const currentUser = req.user as User;

    return this.usersService.findAll({
      user: currentUser,
      includeSubjects: includeSubjects === 'true',
      includeGroups: includeGroups === 'true',
      unassigned: unassigned === 'true',
      role: role,
    });
  }

  @Patch(':id')
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update user data' })
  @ApiResponse({ status: 200, description: 'User updated successfully' })
  async updateUser(
    @Param('id') id: string,
    @Body() updateData: Partial<CreateUserDto>,
    @Request() req,
  ): Promise<User> {
    // For center admins and teachers, ensure they can only update users in their center
    if (
      req.user.role === UserRole.ADMIN ||
      req.user.role === UserRole.TEACHER
    ) {
      const user = await this.usersService.findOne(Number(id));
      if (user.center?.id !== req.user.center?.id) {
        throw new BadRequestException(
          "Siz faqat o'z markazingizdagi foydalanuvchilarni tahrirlashingiz mumkin",
        );
      }
    }

    return this.usersService.update(Number(id), updateData);
  }

  @Patch(':id/assign-center')
  @Roles(UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Assign user to center' })
  @ApiResponse({
    status: 200,
    description: 'User assigned to center successfully',
  })
  async assignUserToCenter(
    @Param('id') userId: string,
    @Body('centerId') centerId: number,
    @Request() req,
  ): Promise<User> {
    // For center admins, ensure they can only assign users to their center
    if (req.user.role === UserRole.ADMIN) {
      if (centerId !== req.user.center?.id) {
        throw new BadRequestException(
          "Siz faqat o'z markazingizga foydalanuvchi biriktira olasiz",
        );
      }
    }

    return this.usersService.assignUserToCenter(Number(userId), centerId);
  }

  @Get('me/telegram-status')
  @ApiOperation({ summary: 'Get current user telegram status' })
  @ApiResponse({ status: 200, description: 'Telegram status' })
  async getMyTelegramStatus(@Request() req) {
    const currentUser = req.user as { id: number };
    return this.usersService.getTelegramStatus(Number(currentUser.id));
  }

  @Post('me/connect-telegram')
  @ApiOperation({ summary: 'Connect telegram to current user' })
  @ApiResponse({ status: 200, description: 'Telegram connection initiated' })
  async connectMyTelegram(
    @Request() req,
    @Body('telegramUsername') telegramUsername: string,
  ) {
    const currentUser = req.user as { id: number };
    return this.usersService.connectTelegram(
      Number(currentUser.id),
      telegramUsername,
    );
  }

  @Get('me')
  @ApiOperation({ summary: 'Me' })
  @ApiResponse({
    status: 200,
    description: "Foydalanuvchi ma'lumotlari",
    type: User,
  })
  async findMe(@Request() req): Promise<any> {
    console.log('User ID:', req.user);
    const currentUser = req.user as { id: number };
    return this.usersService.findOne(Number(currentUser.id));
  }
}
