import { ApiProperty } from '@nestjs/swagger';

export class TestStatsDto {
  @ApiProperty()
  totalTests: number;

  @ApiProperty()
  draftTests: number;

  @ApiProperty()
  publishedTests: number;

  @ApiProperty()
  archivedTests: number;

  @ApiProperty()
  openTests: number;

  @ApiProperty()
  closedTests: number;

  @ApiProperty()
  mixedTests: number;

  @ApiProperty()
  totalQuestions: number;

  @ApiProperty()
  averageQuestionsPerTest: number;

  @ApiProperty()
  testsBySubject: Record<string, number>;
}
