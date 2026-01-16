import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsNotEmpty, IsString, Min } from 'class-validator';

export class CreateResultManualByVariantDto {
  @ApiProperty({ description: 'Variant uniqueNumber (kod)' })
  @IsString()
  @IsNotEmpty()
  uniqueNumber: string;

  @ApiProperty({ description: "O'quvchi ID" })
  @IsInt()
  @Min(1)
  studentId: number;

  @ApiProperty({ description: 'Jami savollar soni' })
  @IsInt()
  @Min(0)
  total: number;

  @ApiProperty({ description: "To'g'ri javoblar soni" })
  @IsInt()
  @Min(0)
  correctCount: number;
}
