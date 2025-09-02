import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, IsOptional } from 'class-validator';

export class TelegramAuthDto {
  @ApiProperty({ example: '123456789' })
  @IsString()
  @IsNotEmpty()
  telegramUserId: string;

  @ApiProperty({ example: 'john_doe', required: false })
  @IsOptional()
  @IsString()
  telegramUsername?: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'https://...', required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({ example: 1638360000 })
  @IsNotEmpty()
  authDate: number;

  @ApiProperty({ example: 'hash_string' })
  @IsString()
  @IsNotEmpty()
  hash: string;
}

export class TelegramLoginDto {
  @ApiProperty({ example: '123456789' })
  @IsString()
  @IsNotEmpty()
  telegramUserId: string;
}

export class TelegramRegisterDto {
  @ApiProperty({ example: '123456789' })
  @IsString()
  @IsNotEmpty()
  telegramUserId: string;

  @ApiProperty({ example: 'john_doe' })
  @IsString()
  @IsNotEmpty()
  telegramUsername: string;

  @ApiProperty({ example: 'John' })
  @IsString()
  @IsNotEmpty()
  firstName: string;

  @ApiProperty({ example: 'Doe', required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ example: 'https://...', required: false })
  @IsOptional()
  @IsString()
  photoUrl?: string;

  @ApiProperty({ example: 1638360000 })
  @IsNotEmpty()
  authDate: number;

  @ApiProperty({ example: 'hash_string' })
  @IsString()
  @IsNotEmpty()
  hash: string;
}
