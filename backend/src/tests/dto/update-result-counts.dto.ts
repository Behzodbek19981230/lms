import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, Min } from 'class-validator';

export class UpdateResultCountsDto {
  @ApiPropertyOptional({ description: "To'g'ri javoblar soni" })
  @IsOptional()
  @IsInt()
  @Min(0)
  correctCount?: number;

  @ApiPropertyOptional({ description: "Noto'g'ri javoblar soni" })
  @IsOptional()
  @IsInt()
  @Min(0)
  wrongCount?: number;
}
