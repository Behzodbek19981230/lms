import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
} from 'class-validator';
import { SubjectCategory } from '../entities/subject.entity';

export class CreateSubjectDto {
  @ApiProperty({ example: 'Matematika' })
  @IsString()
  @IsNotEmpty()
  name: string;

  @ApiProperty({ example: 'Oliy matematika kursi', required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ enum: SubjectCategory, example: SubjectCategory.EXACT })
  @IsEnum(SubjectCategory)
  category: SubjectCategory;

  @ApiProperty({ example: true, description: 'Fanda formulalar ishlatilishi' })
  @IsBoolean()
  hasFormulas: boolean;
}
