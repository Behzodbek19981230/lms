import { ApiProperty } from "@nestjs/swagger"
import { SubjectCategory } from "../entities/subject.entity"

export class SubjectResponseDto {
  @ApiProperty()
  id: string

  @ApiProperty()
  name: string

  @ApiProperty()
  description: string

  @ApiProperty({ enum: SubjectCategory })
  category: SubjectCategory

  @ApiProperty()
  hasFormulas: boolean

  @ApiProperty()
  isActive: boolean

  @ApiProperty()
  testsCount: number

  @ApiProperty()
  createdAt: Date

  @ApiProperty()
  updatedAt: Date
}
