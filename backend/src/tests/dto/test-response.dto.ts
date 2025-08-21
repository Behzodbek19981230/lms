import { ApiProperty } from "@nestjs/swagger"
import { TestType, TestStatus } from "../entities/test.entity"

export class TestResponseDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  title: string

  @ApiProperty()
  description: string

  @ApiProperty({ enum: TestType })
  type: TestType

  @ApiProperty({ enum: TestStatus })
  status: TestStatus

  @ApiProperty()
  duration: number

  @ApiProperty()
  totalQuestions: number

  @ApiProperty()
  totalPoints: number

  @ApiProperty()
  shuffleQuestions: boolean

  @ApiProperty()
  showResults: boolean

  @ApiProperty()
  subject: {
    id: string
    name: string
    category: string
    hasFormulas: boolean
  }

  @ApiProperty()
  teacher: {
    id: string
    fullName: string
  }

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
