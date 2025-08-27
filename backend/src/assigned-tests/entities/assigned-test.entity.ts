import { Column, Entity, JoinColumn, ManyToOne, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Test } from '../../tests/entities/test.entity';
import { Group } from '../../groups/entities/group.entity';
import { User } from '../../users/entities/user.entity';

@Entity('assigned_tests')
export class AssignedTest extends BaseEntity {
  @ManyToOne(() => Test, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'baseTestId' })
  baseTest: Test;

  @ManyToOne(() => Group, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @Column({ default: '' })
  title: string;

  @Column({ type: 'int', default: 0 })
  numQuestions: number;

  @Column({ default: true })
  shuffleAnswers: boolean;

  @OneToMany(() => AssignedTestVariant, (v) => v.assignedTest)
  variants: AssignedTestVariant[];
}

@Entity('assigned_test_variants')
export class AssignedTestVariant extends BaseEntity {
  @ManyToOne(() => AssignedTest, (t) => t.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'assignedTestId' })
  assignedTest: AssignedTest;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column({ type: 'int' })
  variantNumber: number;

  // Stores per-question data with shuffled answers and correct index per variant
  @Column({ type: 'json' })
  payload: {
    questions: Array<{
      questionId: number;
      answerOrder?: number[]; // mapping original index -> shuffled order
      correctIndex?: number; // index in shuffled order for MC/TF
    }>;
  };
}
