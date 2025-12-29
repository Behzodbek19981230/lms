import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Patch,
  Delete,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { ContactsService } from './contacts.service';
import { CreateContactDto } from './dto/create-contact.dto';
import { Contact } from './entities/contact.entity';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';

@ApiTags('contacts')
@Controller('contacts')
export class ContactsController {
  constructor(private readonly contactsService: ContactsService) {}

  @Post()
  @ApiOperation({ summary: 'Yangi kontakt xabari yaratish' })
  @ApiResponse({
    status: 201,
    description: 'Xabar muvaffaqiyatli yaratildi',
    type: Contact,
  })
  async create(@Body() createContactDto: CreateContactDto): Promise<Contact> {
    return await this.contactsService.create(createContactDto);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({
    summary: 'Barcha kontakt xabarlarini olish (faqat super admin)',
  })
  @ApiResponse({
    status: 200,
    description: "Xabarlar ro'yxati",
    type: [Contact],
  })
  async findAll(): Promise<Contact[]> {
    return await this.contactsService.findAll();
  }

  @Get('unread-count')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "O'qilmagan xabarlar sonini olish" })
  @ApiResponse({ status: 200, description: "O'qilmagan xabarlar soni" })
  async getUnreadCount(): Promise<{ count: number }> {
    const count = await this.contactsService.getUnreadCount();
    return { count };
  }

  @Get(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Bitta kontakt xabarini olish' })
  @ApiResponse({ status: 200, description: 'Xabar topildi', type: Contact })
  async findOne(@Param('id') id: string): Promise<Contact> {
    return await this.contactsService.findOne(id);
  }

  @Patch(':id/read')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Xabarni o'qilgan deb belgilash" })
  @ApiResponse({
    status: 200,
    description: "Xabar o'qilgan deb belgilandi",
    type: Contact,
  })
  async markAsRead(@Param('id') id: string): Promise<Contact> {
    return await this.contactsService.markAsRead(id);
  }

  @Delete(':id')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: "Kontakt xabarini o'chirish" })
  @ApiResponse({ status: 200, description: "Xabar o'chirildi" })
  async remove(@Param('id') id: string): Promise<void> {
    return await this.contactsService.remove(id);
  }
}
