import {
  Body,
  Controller,
  Get,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
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
    return this.usersService.create({
      ...dto,
      password: hashedPassword,
      centerId: me.center?.id,
    } as CreateUserDto);
  }

  //   @Post('all')
  //   async findAllUsers(): Promise<User[]> {
  //     return this.usersService.findAll();
  //   }

  //   @Get(':id')
  //   async findUserById(@Param('id') id: number): Promise<User> {
  //     return this.usersService.findOne(id);
  //   }

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

  @Get()
  @Roles(UserRole.SUPERADMIN, UserRole.ADMIN, UserRole.TEACHER)
  @ApiOperation({ summary: 'Foydalanuvchilar ro‘yxati' })
  @ApiResponse({ status: 200, description: 'Foydalanuvchilar ro‘yxati' })
  async findAll(
    @Query('centerId') centerId: string,
    @Query('role') role: string,
    @Request() req,
  ): Promise<User[]> {
    let effectiveCenterId = centerId;
    if (req.user.role === UserRole.ADMIN || req.user.role === UserRole.TEACHER) {
      // Force to own center for admin/teacher
      effectiveCenterId = String(req.user.center?.id || '');
    }
    return this.usersService.findAll(effectiveCenterId, role);
  }

  //   @Patch(':id')
  //   async updateUser(
  //     @Param('id') id: number,
  //     @Body() updateUserDto: Partial<CreateUserDto>,
  //   ): Promise<User> {
  //     return this.usersService.update(id, updateUserDto);
  //   }

  //   @Delete(':id')
  //   async deleteUser(@Param('id') id: number): Promise<void> {
  //     return this.usersService.delete(id);
  //   }
}
