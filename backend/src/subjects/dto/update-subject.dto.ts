import { ApiProperty, PartialType } from "@nestjs/swagger"
import { IsOptional, IsBoolean } from "class-validator"
import { CreateSubjectDto } from "./create-subject.dto"

export class UpdateSubjectDto extends PartialType(CreateSubjectDto) {
  @ApiProperty({ example: true, required: false })
  @IsOptional()
  @IsBoolean()
  isActive?: boolean
}
