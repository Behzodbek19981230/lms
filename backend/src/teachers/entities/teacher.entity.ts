import { Entity, Column, OneToMany, ManyToMany, JoinTable } from "typeorm"
import { BaseEntity } from "../../common/entities/base.entity"
import { Subject } from "../../subjects/entities/subject.entity"
import { Test } from "../../tests/entities/test.entity"

@Entity("teachers")
export class Teacher extends BaseEntity {
  @Column({ unique: true })
  email: string

  @Column()
  password: string

  @Column()
  firstName: string

  @Column()
  lastName: string

  @Column({ nullable: true })
  phone: string

  @Column({ default: true })
  isActive: boolean

  @Column({ type: "timestamp", nullable: true })
  lastLoginAt: Date

  @ManyToMany(
    () => Subject,
    (subject) => subject.teachers,
  )
  @JoinTable({
    name: "teacher_subjects",
    joinColumn: { name: "teacherId", referencedColumnName: "id" },
    inverseJoinColumn: { name: "subjectId", referencedColumnName: "id" },
  })
  subjects: Subject[]

  @OneToMany(
    () => Test,
    (test) => test.teacher,
  )
  tests: Test[]

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`
  }
}
