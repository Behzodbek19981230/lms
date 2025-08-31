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
    return this.usersService.create({
      ...dto,
      password: hashedPassword,
      centerId: Number(centerId) || req.user.center?.id,
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
    const me = await this.usersService.findOne(req.user.id);
    
    if (!me.center?.id) {
      throw new BadRequestException('Admin foydalanuvchisi hech qanday markazga bog\'lanmagan');
    }
    
    return this.usersService.create({
      ...dto,
      password: hashedPassword,
      centerId: me.center.id,
    } as CreateUserDto);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Get users list with optional filters' })
  @ApiResponse({ status: 200, description: 'Users list' })
  async getUsers(
    @Query('role') role?: string,
    @Query('centerId') centerId?: string,
    @Query('includeGroups') includeGroups?: string,
    @Query('includeSubjects') includeSubjects?: string,
    @Request() req?,
  ) {
    // For center admins and teachers, automatically filter by their center
    let effectiveCenterId = centerId;
    if ((req.user.role === UserRole.ADMIN || req.user.role === UserRole.TEACHER) && req.user.center?.id) {
      effectiveCenterId = req.user.center.id.toString();
    }
    
    return this.usersService.findAll(
      effectiveCenterId, 
      role, 
      includeGroups === 'true',
      includeSubjects === 'true'
    );
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
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.TEACHER) {
      const user = await this.usersService.findOne(Number(id));
      if (user.center?.id !== req.user.center?.id) {
        throw new BadRequestException('Siz faqat o\'z markazingizdagi foydalanuvchilarni tahrirlashingiz mumkin');
      }
    }
    
    return this.usersService.update(Number(id), updateData);
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
    return this.usersService.findOne(req.user.id);
  }
}