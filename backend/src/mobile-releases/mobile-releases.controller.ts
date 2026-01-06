import {
  BadRequestException,
  Controller,
  Get,
  Post,
  Query,
  UploadedFile,
  UseGuards,
  UseInterceptors,
  Body,
  Request,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiConsumes,
  ApiOperation,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { diskStorage } from 'multer';
import * as path from 'path';
import * as fs from 'fs';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { UserRole } from '../users/entities/user.entity';
import { MobileReleasesService } from './mobile-releases.service';
import { CreateMobileReleaseDto } from './dto/create-mobile-release.dto';
import { MobileReleasePlatform } from './entities/mobile-release.entity';

@ApiTags('Mobile Releases')
@Controller('mobile-releases')
export class MobileReleasesController {
  constructor(private readonly mobileReleasesService: MobileReleasesService) {}

  @Get('public/latest')
  @ApiOperation({ summary: 'Get latest mobile release (public)' })
  @ApiResponse({ status: 200, description: 'Latest release or null' })
  async getLatestPublic(@Query('platform') platform?: string) {
    const p = String(platform || '')
      .toLowerCase()
      .trim();
    const parsed =
      p === 'android'
        ? MobileReleasePlatform.ANDROID
        : p === 'ios'
          ? MobileReleasePlatform.IOS
          : undefined;
    return this.mobileReleasesService.getLatest(parsed);
  }

  @Get()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'List all mobile releases (superadmin)' })
  async listAll() {
    return this.mobileReleasesService.listAll();
  }

  @Post()
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPERADMIN)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Upload a new mobile app release (superadmin)' })
  @ApiConsumes('multipart/form-data')
  @ApiResponse({ status: 201, description: 'Created release' })
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: (req, _file, cb) => {
          const dest = path.join(process.cwd(), 'tmp', 'mobile-releases');
          try {
            fs.mkdirSync(dest, { recursive: true });
          } catch {}
          cb(null, dest);
        },
        filename: (_req, file, cb) => {
          const ext = path.extname(file.originalname || '') || '';
          const name = `upload-${Date.now()}${ext}`;
          cb(null, name);
        },
      }),
      limits: {
        fileSize: 1024 * 1024 * 1024, // 1GB
      },
    }),
  )
  async create(
    @Body() dto: CreateMobileReleaseDto,
    @UploadedFile() file: Express.Multer.File,
    @Request() req: any,
  ) {
    if (!dto?.platform || !dto?.version) {
      throw new BadRequestException('platform va version majburiy');
    }
    return this.mobileReleasesService.createRelease(dto, file, req?.user);
  }
}
