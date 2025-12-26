import { ApiProperty } from '@nestjs/swagger';
import { IsBoolean } from 'class-validator';

export class UpdateCenterStatusDto {
  @ApiProperty({ example: false })
  @IsBoolean()
  isActive: boolean;
}
