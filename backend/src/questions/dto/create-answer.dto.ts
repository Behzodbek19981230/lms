import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
} from 'class-validator';

export class CreateAnswerDto {
  @ApiProperty({ example: "Bu to'g'ri javob" })
  @IsString()
  @IsNotEmpty()
  text: string;

  @ApiProperty({ example: true })
  @IsBoolean()
  isCorrect: boolean;

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  order?: number;

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  hasFormula?: boolean;

  @ApiProperty({ example: "Bu javob to'g'ri chunki...", required: false })
  @IsOptional()
  @IsString()
  explanation?: string;
}
