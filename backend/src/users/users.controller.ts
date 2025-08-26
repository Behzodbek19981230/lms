import {
  Body,
  Controller,
  Get,
  Post,
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
import { User } from './entities/user.entity';
import { CreateUserDto } from './dto/create-user.dto';
import * as bcrypt from 'bcryptjs';

@ApiTags('Users')
@Controller('users')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Post()
  async createUser(@Body() createUserDto: CreateUserDto): Promise<User> {
    const hashedPassword = await bcrypt.hash(createUserDto.password, 12);

    return this.usersService.create({
      ...createUserDto,
      password: hashedPassword,
    });
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
