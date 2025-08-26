import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateCenterDto {
  @ApiProperty({ example: 'Matematika' })
  @IsString()
  @IsNotEmpty()
  name?: string;

  @ApiProperty({ example: 'Oliy matematika kursi', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({
    example: 'Toshkent shaxri, Yunusobod tumani',
    required: false,
  })
  @IsOptional()
  @IsString()
  address?: string;

  @ApiProperty({ example: '+998 90 123 45 67', required: false })
  @IsOptional()
  @IsString()
  phone?: string;
}
