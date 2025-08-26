import { Column, Entity, ManyToMany, OneToMany, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Test } from '../../tests/entities/test.entity';
import { User } from '../../users/entities/user.entity';
import { Center } from 'src/centers/entities/center.entity';

export enum SubjectCategory {
  EXACT = 'exact_science',
  SOCIAL = 'social_science',
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

  @ManyToMany(() => User, (teacher) => teacher.subjects)
  teachers: User[];

  @OneToMany(() => Test, (test) => test.subject)
  tests: Test[];

  @ManyToOne(() => Center, (center) => center.subjects, { onDelete: 'CASCADE' })
  center: Center;
}
