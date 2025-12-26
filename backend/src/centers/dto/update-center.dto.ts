import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsOptional, IsString } from 'class-validator';

export class UpdateCenterDto {
  @ApiPropertyOptional({ example: 'EduOne Center' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ example: 'O‘quv markazi', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiPropertyOptional({ example: 'Toshkent sh., Yunusobod', required: false })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiPropertyOptional({ example: '+998 90 123 45 67', required: false })
  @IsOptional()
  @IsString()
  phone?: string;

  @ApiPropertyOptional({ example: true })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean;
}
