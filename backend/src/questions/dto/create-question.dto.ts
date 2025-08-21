import { ApiProperty } from "@nestjs/swagger"
import {
  IsString,
  IsNotEmpty,
  IsOptional,
  IsEnum,
  IsNumber,
  IsBoolean,
  IsArray,
  ValidateNested,
  IsUUID,
} from "class-validator"
import { Type } from "class-transformer"
import { QuestionType } from "../entities/question.entity"
import { CreateAnswerDto } from "./create-answer.dto"

export class CreateQuestionDto {
  @ApiProperty({ example: "2 + 2 = ?" })
  @IsString()
  @IsNotEmpty()
  text: string

  @ApiProperty({ example: "Bu oddiy qo'shish amali", required: false })
  @IsOptional()
  @IsString()
  explanation?: string

  @ApiProperty({ enum: QuestionType, example: QuestionType.MULTIPLE_CHOICE })
  @IsEnum(QuestionType)
  type: QuestionType

  @ApiProperty({ example: 1 })
  @IsNumber()
  points: number

  @ApiProperty({ example: 0, required: false })
  @IsOptional()
  @IsNumber()
  order?: number

  @ApiProperty({ example: false, required: false })
  @IsOptional()
  @IsBoolean()
  hasFormula?: boolean

  @ApiProperty({ example: "data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAA...", required: false })
  @IsOptional()
  @IsString()
  imageBase64?: string

  @ApiProperty({ example: "uuid" })
  @IsUUID()
  @IsNotEmpty()
  testId: string

  @ApiProperty({ type: [CreateAnswerDto], required: false })
  @IsOptional()
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => CreateAnswerDto)
  answers?: CreateAnswerDto[]
}
