import { ApiProperty } from "@nestjs/swagger"
import { QuestionType } from "../entities/question.entity"

export class AnswerResponseDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  text: string

  @ApiProperty()
  isCorrect: boolean

  @ApiProperty()
  order: number

  @ApiProperty()
  hasFormula: boolean

  @ApiProperty()
  explanation: string
}

export class QuestionResponseDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  text: string

  @ApiProperty()
  explanation: string

  @ApiProperty({ enum: QuestionType })
  type: QuestionType

  @ApiProperty()
  points: number

  @ApiProperty()
  order: number

  @ApiProperty()
  hasFormula: boolean

  @ApiProperty()
  imageUrl: string

  @ApiProperty()
  metadata: Record<string, any>

  @ApiProperty({ type: [AnswerResponseDto] })
  answers: AnswerResponseDto[]

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
