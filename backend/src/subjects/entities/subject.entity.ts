import { Column, Entity, ManyToMany, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Teacher } from '../../teachers/entities/teacher.entity';
import { Test } from '../../tests/entities/test.entity';

export enum SubjectCategory {
  MATHEMATICS = 'mathematics',
  PHYSICS = 'physics',
  CHEMISTRY = 'chemistry',
  BIOLOGY = 'biology',
  LANGUAGE = 'language',
  LITERATURE = 'literature',
  HISTORY = 'history',
  GEOGRAPHY = 'geography',
  COMPUTER_SCIENCE = 'computer_science',
  OTHER = 'other',
}

@Entity('subjects')
export class Subject extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: SubjectCategory,
    default: SubjectCategory.OTHER,
  })
  category: SubjectCategory;

  @Column({ default: false })
  hasFormulas: boolean;

  @Column({ default: true })
  isActive: boolean;

  @Column({ default: 0 })
  testsCount: number;

  @ManyToMany(() => Teacher, (teacher) => teacher.subjects)
  teachers: Teacher[];

  @OneToMany(() => Test, (test) => test.subject)
  tests: Test[];
}
