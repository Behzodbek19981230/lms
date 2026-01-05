import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsArray, IsDateString, IsInt } from 'class-validator';

export class BulkTasksDto {
  @ApiProperty()
  @Type(() => Number)
  @IsInt()
  groupId: number;

  @ApiProperty({ description: 'ISO date (YYYY-MM-DD)' })
  @IsDateString()
  date: string;

  @ApiProperty({
    type: [Number],
    description: 'IDs of students who did NOT do the task',
  })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  notDoneStudentIds: number[];
}
