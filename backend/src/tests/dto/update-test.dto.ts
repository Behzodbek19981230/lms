import { ApiProperty, PartialType } from "@nestjs/swagger"
import { IsOptional, IsEnum } from "class-validator"
import { CreateTestDto } from "./create-test.dto"
import { TestStatus } from "../entities/test.entity"

export class UpdateTestDto extends PartialType(CreateTestDto) {
  @ApiProperty({ enum: TestStatus, required: false })
  @IsOptional()
  @IsEnum(TestStatus)
  status?: TestStatus
}
