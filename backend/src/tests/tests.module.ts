import { Module } from "@nestjs/common"
import { TypeOrmModule } from "@nestjs/typeorm"
import { TestsService } from "./tests.service"
import { TestsController } from "./tests.controller"
import { Test } from "./entities/test.entity"
import { Teacher } from "../teachers/entities/teacher.entity"
import { Subject } from "../subjects/entities/subject.entity"

@Module({
  imports: [TypeOrmModule.forFeature([Test, Teacher, Subject])],
  controllers: [TestsController],
  providers: [TestsService],
  exports: [TestsService],
})
export class TestsModule {}
