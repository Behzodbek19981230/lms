import { ApiProperty } from '@nestjs/swagger';

export class GroupResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty({ required: false })
  description?: string;

  @ApiProperty({ required: false })
  subjectId?: number | null;

  @ApiProperty({ type: [Number] })
  studentIds: number[];

  @ApiProperty({ type: [String] })
  daysOfWeek: string[];

  @ApiProperty()
  startTime: string;

  @ApiProperty()
  endTime: string;

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
