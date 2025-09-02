import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  CreateDateColumn,
  UpdateDateColumn,
  Index,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';

export enum PendingPdfType {
  EXAM_VARIANT = 'exam_variant',
  ASSIGNED_TEST = 'assigned_test',
  EXAM_ANSWER_KEY = 'exam_answer_key',
}

export enum PendingPdfStatus {
  PENDING = 'pending',
  SENT = 'sent',
  EXPIRED = 'expired',
  FAILED = 'failed',
}

@Entity('pending_pdfs')
@Index(['userId', 'status'])
@Index(['createdAt'])
export class PendingPdf {
  @PrimaryGeneratedColumn()
  id: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  user: User;

  @Column()
  userId: number;

  @Column({
    type: 'enum',
    enum: PendingPdfType,
  })
  type: PendingPdfType;

  @Column({
    type: 'enum',
    enum: PendingPdfStatus,
    default: PendingPdfStatus.PENDING,
  })
  status: PendingPdfStatus;

  @Column()
  fileName: string;

  @Column('text')
  caption: string;

  // Store reference data to regenerate PDF if needed
  @Column('json')
  metadata: {
    examId?: number;
    variantId?: number;
    assignedTestId?: number;
    isAnswerKey?: boolean;
    [key: string]: any;
  };

  // Store the PDF buffer as base64 or file path
  @Column('text', { nullable: true })
  pdfData: string | null;

  @Column({ type: 'timestamp', nullable: true })
  sentAt: Date;

  @Column({ type: 'timestamp', nullable: true })
  expiresAt: Date;

  @Column({ type: 'text', nullable: true })
  failureReason: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
