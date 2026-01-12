import {
  BadRequestException,
  Controller,
  Post,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import type { Express } from 'express';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RequireCenterPermissions } from '../centers/permissions/center-permission.decorator';
import { CenterPermissionKey } from '../centers/permissions/center-permissions';
import { ImportProxyService } from './import-proxy.service';

@ApiTags('Import')
@Controller('import')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class ImportProxyController {
  constructor(private readonly importProxyService: ImportProxyService) {}

  @Post('questions')
  @RequireCenterPermissions(CenterPermissionKey.TESTS)
  @UseInterceptors(FileInterceptor('file'))
  @ApiOperation({ summary: 'DOCX/XLSX savollarni import qilish (proxy)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Parsed questions + errors' })
  async importQuestions(@UploadedFile() file?: Express.Multer.File) {
    if (!file)
      throw new BadRequestException(
        'No file uploaded (field name must be "file")',
      );
    return this.importProxyService.importQuestions(file);
  }
}
