import { BadRequestException, Injectable } from '@nestjs/common';
import type { ConfigService } from '@nestjs/config';
import type { Express } from 'express';

@Injectable()
export class UploadsService {
  constructor(private configService: ConfigService) {}

  uploadImageAsBase64(file: Express.Multer.File): string {
    if (!file) {
      throw new BadRequestException('Fayl tanlanmagan');
    }

    // Validate file type
    const allowedTypes = [
      'image/jpeg',
      'image/jpg',
      'image/png',
      'image/gif',
      'image/webp',
    ];
    if (!allowedTypes.includes(file.mimetype)) {
      throw new BadRequestException('Faqat rasm fayllari ruxsat etilgan');
    }

    // Validate file size (5MB max for base64 storage)
    const maxSize = this.configService.get<number>('MAX_FILE_SIZE', 5242880); // 5MB
    if (file.size > maxSize) {
      throw new BadRequestException('Fayl hajmi juda katta (maksimal 5MB)');
    }

    // Convert to base64
    const base64String = `data:${file.mimetype};base64,${file.buffer.toString('base64')}`;

    return base64String;
  }
}
