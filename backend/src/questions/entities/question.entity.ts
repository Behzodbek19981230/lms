import { Entity, Column, ManyToOne, OneToMany, JoinColumn } from "typeorm"
import { BaseEntity } from "../../common/entities/base.entity"
import { Test } from "../../tests/entities/test.entity"
import { Answer } from "./answer.entity"

export enum QuestionType {
  MULTIPLE_CHOICE = "multiple_choice",
  TRUE_FALSE = "true_false",
  ESSAY = "essay",
  SHORT_ANSWER = "short_answer",
  FILL_BLANK = "fill_blank",
}

@Entity("questions")
export class Question extends BaseEntity {
  @Column()
  text: string

  @Column({ nullable: true })
  explanation: string

  @Column({
    type: "enum",
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  type: QuestionType

  @Column({ default: 1 })
  points: number

  @Column({ default: 0 })
  order: number

  @Column({ default: false })
  hasFormula: boolean

  @Column({ type: "text", nullable: true })
  imageBase64: string

  @Column({ type: "json", nullable: true })
  metadata: Record<string, any>

  @ManyToOne(
    () => Test,
    (test) => test.questions,
    { onDelete: "CASCADE" },
  )
  @JoinColumn({ name: "testId" })
  test: Test

  @OneToMany(
    () => Answer,
    (answer) => answer.question,
    { cascade: false },
  )
  answers: Answer[]
}
