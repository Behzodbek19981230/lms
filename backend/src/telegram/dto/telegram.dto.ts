import { ApiProperty } from '@nestjs/swagger';
import { IsEnum, IsOptional, IsString, IsNumber } from 'class-validator';
import { ChatType } from '../entities/telegram-chat.entity';

export class CreateTelegramChatDto {
  @ApiProperty()
  @IsString()
  chatId: string;

  @ApiProperty({ enum: ChatType })
  @IsEnum(ChatType)
  type: ChatType;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telegramUserId?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telegramUsername?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  userId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  centerId?: number;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsNumber()
  subjectId?: number;
}

export class AuthenticateUserDto {
  @ApiProperty()
  @IsString()
  telegramUserId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  username?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  firstName?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  lastName?: string;
}

export class SendTestToChannelDto {
  @ApiProperty()
  @IsNumber()
  testId: number;

  @ApiProperty()
  @IsString()
  channelId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  customMessage?: string;
}

export class SubmitAnswerDto {
  @ApiProperty()
  @IsString()
  messageId: string;

  @ApiProperty()
  @IsNumber()
  testId: number;

  @ApiProperty()
  @IsNumber()
  questionNumber: number;

  @ApiProperty()
  @IsString()
  answerText: string;

  @ApiProperty()
  @IsString()
  chatId: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  telegramUserId?: string;
}