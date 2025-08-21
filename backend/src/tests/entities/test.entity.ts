import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm"
import { BaseEntity } from "../../common/entities/base.entity"
import { Teacher } from "../../teachers/entities/teacher.entity"
import { Subject } from "../../subjects/entities/subject.entity"
import { Question } from "../../questions/entities/question.entity"

export enum TestType {
  OPEN = "open", // Multiple choice, true/false
  CLOSED = "closed", // Essay, short answer
  MIXED = "mixed", // Both types
}

export enum TestStatus {
  DRAFT = "draft",
  PUBLISHED = "published",
  ARCHIVED = "archived",
}

@Entity("tests")
export class Test extends BaseEntity {
  @Column()
  title: string

  @Column({ nullable: true })
  description: string

  @Column({
    type: "enum",
    enum: TestType,
    default: TestType.OPEN,
  })
  type: TestType

  @Column({
    type: "enum",
    enum: TestStatus,
    default: TestStatus.DRAFT,
  })
  status: TestStatus

  @Column({ default: 60 })
  duration: number // in minutes

  @Column({ default: 0 })
  totalQuestions: number

  @Column({ default: 0 })
  totalPoints: number

  @Column({ default: true })
  shuffleQuestions: boolean

  @Column({ default: true })
  showResults: boolean

  @ManyToOne(
    () => Teacher,
    (teacher) => teacher.tests,
  )
  @JoinColumn({ name: "teacherId" })
  teacher: Teacher

  @ManyToOne(
    () => Subject,
    (subject) => subject.tests,
  )
  @JoinColumn({ name: "subjectId" })
  subject: Subject

  @OneToMany(
    () => Question,
    (question) => question.test,
  )
  questions: Question[]
}
