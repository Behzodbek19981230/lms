import {
  Body,
  Controller,
  Delete,
  BadRequestException,
  FileTypeValidator,
  Get,
  MaxFileSizeValidator,
  Param,
  Patch,
  Post,
  Request,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';

import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { CentersService } from './centers.service';
import { CreateCenterDto } from './dto/create-center.dto';
import { UpdateCenterDto } from './dto/update-center.dto';
import { UpdateCenterStatusDto } from './dto/update-center-status.dto';
import { Center } from './entities/center.entity';
import { UpdateCenterPermissionsDto } from './dto/update-center-permissions.dto';
import { FileInterceptor } from '@nestjs/platform-express';
import { ParseFilePipe } from '@nestjs/common';
import { CenterImportService } from './import/center-import.service';
import { buildCenterImportTemplateXlsx } from './import/center-import.template';

@ApiTags('Centers')
@Controller('centers')
@UseGuards(JwtAuthGuard, RolesGuard)
@ApiBearerAuth()
export class CentersController {
  constructor(
    private readonly centerService: CentersService,
    private readonly centerImportService: CenterImportService,
  ) {}

  @Post()
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Yangi markaz yaratish' })
  @ApiResponse({
    status: 201,
    description: 'Markaz muvaffaqiyatli yaratildi',
  })
  @ApiBody({ type: CreateCenterDto })
  async create(
    @Body() createCenterDto: CreateCenterDto,
    @Request() req,
  ): Promise<any> {
    return this.centerService.create(createCenterDto, req.user);
  }

  @Get()
  @Roles(UserRole.TEACHER, UserRole.ADMIN, UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Markazlar ro‘yxatini olish' })
  @ApiResponse({
    status: 200,
    description: 'Markazlar ro‘yxati',
    type: [Center],
  })
  async findAll(@Request() req): Promise<Center[]> {
    return this.centerService.findAll(req.user);
  }

  @Get(':id')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Markaz ma‘lumotlarini olish' })
  @ApiResponse({
    status: 200,
    description: 'Markaz ma‘lumotlari',
    type: Center,
  })
  async findOne(@Param('id') id: number, @Request() req): Promise<Center> {
    return this.centerService.findOne(id, req.user);
  }

  @Patch(':id')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Markaz ma‘lumotlarini yangilash' })
  @ApiResponse({
    status: 200,
    description: 'Markaz ma‘lumotlari yangilandi',
    type: Center,
  })
  async update(
    @Param('id') id: number,
    @Body() updateCenterDto: UpdateCenterDto,
    @Request() req,
  ): Promise<Center> {
    return this.centerService.update(id, updateCenterDto, req.user);
  }

  @Patch(':id/status')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Markaz holatini (active/inactive) yangilash' })
  @ApiBody({ type: UpdateCenterStatusDto })
  async updateStatus(
    @Param('id') id: number,
    @Body() dto: UpdateCenterStatusDto,
    @Request() req,
  ): Promise<Center> {
    return this.centerService.updateStatus(Number(id), dto.isActive, req.user);
  }

  @Delete(':id')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Markaz ma‘lumotlarini o‘chirish' })
  @ApiResponse({
    status: 200,
    description: 'Markaz ma‘lumotlari o‘chirildi',
  })
  async remove(@Param('id') id: number, @Request() req): Promise<void> {
    return this.centerService.remove(id, req.user);
  }

  @Get(':id/permissions')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Center permissions (superadmin)' })
  async getPermissions(@Param('id') id: number, @Request() req) {
    return this.centerService.getCenterPermissions(Number(id), req.user);
  }

  @Patch(':id/permissions')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Update center permissions (superadmin)' })
  @ApiBody({ type: UpdateCenterPermissionsDto })
  async updatePermissions(
    @Param('id') id: number,
    @Body() dto: UpdateCenterPermissionsDto,
    @Request() req,
  ) {
    return this.centerService.updateCenterPermissions(
      Number(id),
      dto?.permissions || {},
      req.user,
    );
  }

  @Get('import/template')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Download Excel import template' })
  async downloadImportTemplate(@Request() req: any) {
    const res = req?.res;
    if (!res) return buildCenterImportTemplateXlsx();
    const buf = buildCenterImportTemplateXlsx();
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    );
    res.setHeader(
      'Content-Disposition',
      'attachment; filename="center-import-template.xlsx"',
    );
    return res.send(buf);
  }

  @Post(':id/import/excel')
  @Roles(UserRole.SUPERADMIN)
  @ApiOperation({ summary: 'Import center data from Excel (groups, students, payments)' })
  @UseInterceptors(FileInterceptor('file'))
  async importExcel(
    @Param('id') id: number,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 10 * 1024 * 1024 }), // 10MB
          // mimetype usually contains "sheet" or "excel"
          new FileTypeValidator({ fileType: /(sheet|excel)/ }),
        ],
      }),
    )
    file: Express.Multer.File,
  ) {
    if (!file?.buffer) {
      throw new BadRequestException('Fayl topilmadi');
    }
    return this.centerImportService.importExcel(Number(id), file.buffer);
  }
}
