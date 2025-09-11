import { Entity, Column, ManyToOne, JoinColumn, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Subject } from '../../subjects/entities/subject.entity';

@Entity('generated_tests')
export class GeneratedTest extends BaseEntity {
  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({ default: 1 })
  variantCount: number;

  @Column({ default: 10 })
  questionCount: number;

  @Column({ default: 60 })
  timeLimit: number;

  @Column({ default: 'mixed' })
  difficulty: string;

  @Column({ default: false })
  includeAnswers: boolean;

  @Column({ default: false })
  showTitleSheet: boolean;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  @ManyToOne(() => Subject, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'subjectId' })
  subject: Subject;

  @OneToMany(() => GeneratedTestVariant, (variant) => variant.generatedTest)
  variants: GeneratedTestVariant[];
}

@Entity('generated_test_variants')
export class GeneratedTestVariant extends BaseEntity {
  @Column({ unique: true, length: 10 })
  uniqueNumber: string;

  @Column()
  variantNumber: number;

  @Column({ type: 'json' })
  questionsData: any; // Store the questions with shuffled answers

  @Column({ type: 'timestamp', nullable: true })
  generatedAt: Date;

  @ManyToOne(() => GeneratedTest, (test) => test.variants, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'generatedTestId' })
  generatedTest: GeneratedTest;
}
