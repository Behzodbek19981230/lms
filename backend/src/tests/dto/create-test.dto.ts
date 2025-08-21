import { ApiProperty } from "@nestjs/swagger"
import { IsString, IsNotEmpty, IsOptional, IsEnum, IsNumber, IsBoolean, IsUUID, Min, Max } from "class-validator"
import { TestType } from "../entities/test.entity"

export class CreateTestDto {
  @ApiProperty({ example: "Matematika - 1-bob testi" })
  @IsString()
  @IsNotEmpty()
  title: string

  @ApiProperty({ example: "Algebraik ifodalar bo'yicha test", required: false })
  @IsOptional()
  @IsString()
  description?: string

  @ApiProperty({ enum: TestType, example: TestType.OPEN })
  @IsEnum(TestType)
  type: TestType

  @ApiProperty({ example: 60, description: "Test davomiyligi (daqiqalarda)" })
  @IsNumber()
  @Min(5)
  @Max(300)
  duration: number

  @ApiProperty({ example: true, description: "Savollarni aralashtirish" })
  @IsBoolean()
  shuffleQuestions: boolean

  @ApiProperty({ example: true, description: "Natijalarni ko'rsatish" })
  @IsBoolean()
  showResults: boolean

  @ApiProperty({ example: "uuid", description: "Fan ID si" })
  @IsUUID()
  @IsNotEmpty()
  subjectId: string
}
