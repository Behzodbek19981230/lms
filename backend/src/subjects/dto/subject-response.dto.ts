import { ApiProperty } from '@nestjs/swagger';
import { SubjectCategory } from '../entities/subject.entity';

export class TeacherDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  firstName: string;

  @ApiProperty()
  lastName: string;

  @ApiProperty()
  username: string;
}

export class SubjectResponseDto {
  @ApiProperty()
  id: number;

  @ApiProperty()
  name: string;

  @ApiProperty()
  description: string;

  @ApiProperty({ enum: SubjectCategory })
  category: SubjectCategory;

  @ApiProperty()
  hasFormulas: boolean;

  @ApiProperty()
  isActive: boolean;

  @ApiProperty()
  testsCount: number;

  @ApiProperty({ type: [TeacherDto], required: false })
  teachers?: TeacherDto[];

  @ApiProperty()
  createdAt: Date;

  @ApiProperty()
  updatedAt: Date;
}
