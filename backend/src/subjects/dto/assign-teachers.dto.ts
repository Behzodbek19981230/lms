import { ApiProperty } from '@nestjs/swagger';
import { IsArray, IsInt } from 'class-validator';
import { Type } from 'class-transformer';

export class AssignTeachersDto {
  @ApiProperty({ type: [Number], description: 'Teacher ID lar ro\'yxati' })
  @IsArray()
  @Type(() => Number)
  @IsInt({ each: true })
  teacherIds: number[];
}
