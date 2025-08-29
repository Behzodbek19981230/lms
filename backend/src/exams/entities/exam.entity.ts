import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  JoinColumn,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Group } from '../../groups/entities/group.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { ExamVariant } from './exam-variant.entity';

export enum ExamStatus {
  DRAFT = 'draft',
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
}

export enum ExamType {
  SINGLE_SUBJECT = 'single_subject',
  BLOCK = 'block',
}

@Entity('exams')
export class Exam extends BaseEntity {
  @Column()
  title: string;

  @Column({ nullable: true })
  description: string;

  @Column({
    type: 'enum',
    enum: ExamType,
    default: ExamType.SINGLE_SUBJECT,
  })
  type: ExamType;

  @Column({
    type: 'enum',
    enum: ExamStatus,
    default: ExamStatus.DRAFT,
  })
  status: ExamStatus;

  @Column({ type: 'timestamp' })
  examDate: Date;

  @Column({ type: 'timestamp', nullable: true })
  startTime: Date;

  @Column({ type: 'timestamp', nullable: true })
  endTime: Date;

  @Column({ default: 120 }) // daqiqada
  duration: number;

  @Column({ default: true })
  shuffleQuestions: boolean;

  @Column({ default: true })
  shuffleAnswers: boolean;

  @Column({ default: 1 })
  variantsPerStudent: number;

  @Column({ type: 'json', nullable: true })
  settings: {
    allowCalculator?: boolean;
    allowNotes?: boolean;
    showTimer?: boolean;
    autoSubmit?: boolean;
  };

  // Imtihonni yaratgan o'qituvchi
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'teacherId' })
  teacher: User;

  // Imtihondagi guruhlar
  @ManyToMany(() => Group)
  @JoinTable({
    name: 'exam_groups',
    joinColumn: { name: 'examId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'groupId', referencedColumnName: 'id' },
  })
  groups: Group[];

  // Imtihondagi fanlar (block test uchun)
  @ManyToMany(() => Subject)
  @JoinTable({
    name: 'exam_subjects',
    joinColumn: { name: 'examId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'subjectId', referencedColumnName: 'id' },
  })
  subjects: Subject[];

  // Har bir o'quvchi uchun generatsiya qilingan variantlar
  @OneToMany(() => ExamVariant, (variant) => variant.exam)
  variants: ExamVariant[];

  // Statistika
  @Column({ default: 0 })
  totalStudents: number;

  @Column({ default: 0 })
  completedStudents: number;

  @Column({ default: 0 })
  totalQuestions: number;

  @Column({ default: 0 })
  totalPoints: number;
}
