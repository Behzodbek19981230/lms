import { Column, Entity, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { ExamVariant } from './exam-variant.entity';
import { Question } from '../../questions/entities/question.entity';

export enum QuestionType {
  MULTIPLE_CHOICE = 'multiple_choice',
  TRUE_FALSE = 'true_false',
  ESSAY = 'essay',
  SHORT_ANSWER = 'short_answer',
  FILL_BLANK = 'fill_blank',
}

@Entity('exam_variant_questions')
export class ExamVariantQuestion extends BaseEntity {
  @Column()
  questionText: string;

  @Column({
    type: 'enum',
    enum: QuestionType,
    default: QuestionType.MULTIPLE_CHOICE,
  })
  type: QuestionType;

  @Column({ default: 1 })
  points: number;

  @Column({ default: 0 })
  order: number;

  @Column({ default: false })
  hasFormula: boolean;

  @Column({ type: 'text', nullable: true })
  imageBase64: string;

  @Column({ type: 'text', nullable: true })
  explanation: string;

  // Javoblar (JSON formatda)
  @Column({ type: 'json' })
  answers: Array<{
    id: number;
    text: string;
    isCorrect: boolean;
    order: number;
    hasFormula?: boolean;
  }>;

  // O'quvchining javobi
  @Column({ type: 'json', nullable: true })
  studentAnswer: {
    selectedAnswers?: number[]; // multiple choice uchun
    textAnswer?: string; // essay/short answer uchun
    isCorrect?: boolean; // true/false uchun
    submittedAt?: Date;
  };

  // To'g'ri javob indeksi (shuffled orderda)
  @Column({ nullable: true })
  correctAnswerIndex: number;

  // Savollar aralashtirilgan tartibi
  @Column({ type: 'json', nullable: true })
  shuffledOrder: number[];

  // Variant
  @ManyToOne(() => ExamVariant, (variant) => variant.questions, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'examVariantId' })
  variant: ExamVariant;

  // Asl savol (reference uchun)
  @ManyToOne(() => Question, { nullable: true, onDelete: 'SET NULL' })
  @JoinColumn({ name: 'originalQuestionId' })
  originalQuestion: Question;

  // Fan (block test uchun)
  @Column({ nullable: true })
  subjectName: string;

  @Column({ nullable: true })
  subjectId: number;
}
