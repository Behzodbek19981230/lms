import { Column, Entity, ManyToOne, OneToMany, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Exam } from './exam.entity';
import { ExamVariantQuestion } from './exam-variant-question.entity';

export enum ExamVariantStatus {
  GENERATED = 'generated',
  STARTED = 'started',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  SUBMITTED = 'submitted',
  GRADED = 'graded',
}

@Entity('exam_variants')
export class ExamVariant extends BaseEntity {
  @Column({ unique: true })
  variantNumber: string; // Masalan: "2024-001-001" (yil-imtihon-o'quvchi)

  @Column({
    type: 'enum',
    enum: ExamVariantStatus,
    default: ExamVariantStatus.GENERATED,
  })
  status: ExamVariantStatus;

  @Column({ type: 'timestamp', nullable: true })
  startedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  completedAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  submittedAt: Date;

  @Column({ default: 0 })
  score: number;

  @Column({ default: 0 })
  totalPoints: number;

  @Column({ default: 0 })
  correctAnswers: number;

  @Column({ default: 0 })
  totalQuestions: number;

  @Column({ type: 'json', nullable: true })
  metadata: {
    timeSpent?: number; // daqiqada
    questionsAnswered?: number;
    lastActivity?: Date;
    deviceInfo?: string;
    ipAddress?: string;
  };

  // Imtihon
  @ManyToOne(() => Exam, (exam) => exam.variants, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'examId' })
  exam: Exam;

  // O'quvchi
  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  // Variantdagi savollar
  @OneToMany(() => ExamVariantQuestion, (question) => question.variant)
  questions: ExamVariantQuestion[];

  // PDF fayllar uchun
  @Column({ nullable: true })
  questionPdfPath: string;

  @Column({ nullable: true })
  answerPdfPath: string;

  @Column({ nullable: true })
  resultPdfPath: string;

  // Generated printable HTML path (public URL like /print/filename.html)
  @Column({ type: 'text', nullable: true })
  printHtmlPath: string | null;
}
