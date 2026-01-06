import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsString, Matches } from 'class-validator';
import { MobileReleasePlatform } from '../entities/mobile-release.entity';

export class CreateMobileReleaseDto {
  @ApiProperty({
    enum: MobileReleasePlatform,
    example: MobileReleasePlatform.ANDROID,
  })
  @IsEnum(MobileReleasePlatform)
  platform: MobileReleasePlatform;

  // Supports: 1, 2, 3, 1.0.0 etc.
  @ApiProperty({ example: '1' })
  @IsString()
  @Matches(/^[0-9]+(\.[0-9]+)*$/, {
    message:
      'version faqat raqam va nuqta formatida bo‘lishi kerak (masalan: 1 yoki 1.0.0)',
  })
  version: string;
}
