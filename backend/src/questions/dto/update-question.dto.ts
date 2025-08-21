import { ApiProperty, PartialType } from "@nestjs/swagger"
import { IsOptional, IsString } from "class-validator"
import { CreateQuestionDto } from "./create-question.dto"

export class UpdateQuestionDto extends PartialType(CreateQuestionDto) {
  @ApiProperty({ required: false })
  @IsOptional()
  @IsString()
  imageUrl?: string
}
