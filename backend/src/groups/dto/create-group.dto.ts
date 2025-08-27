import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsMilitaryTime,
  IsOptional,
  IsString,
  IsIn,
} from 'class-validator';

export class CreateGroupDto {
  @ApiProperty()
  @IsString()
  name: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  description?: string;

  @ApiProperty({ required: false })
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  subjectId?: number;

  @ApiProperty({ type: [Number], required: false })
  @IsOptional()
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  studentIds?: number[];

  @ApiProperty({ type: [String] })
  @IsArray()
  @IsIn(
    ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'],
    { each: true },
  )
  daysOfWeek: string[]; // monday..sunday

  @ApiProperty()
  @IsMilitaryTime()
  startTime: string; // HH:mm

  @ApiProperty()
  @IsMilitaryTime()
  endTime: string; // HH:mm
}
