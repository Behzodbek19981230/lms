import { ApiProperty } from '@nestjs/swagger';

export class StudentDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  username: string;

  @ApiProperty()
  role: string;
}

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

  @ApiProperty({ type: [StudentDto] })
  students: StudentDto[];

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

  @ApiProperty({
    required: false,
    description:
      'Telegram bot deep-link payload for this group. Use with https://t.me/<bot>?start=<payload>',
    example: 'g_12_abcdEFGH1234',
  })
  telegramStartPayload?: string;
}
