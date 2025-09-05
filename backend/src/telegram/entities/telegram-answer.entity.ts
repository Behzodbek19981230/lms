import { Column, Entity, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { TelegramChat } from './telegram-chat.entity';

export enum AnswerStatus {
  PENDING = 'pending',
  CHECKED = 'checked',
  INVALID = 'invalid'
}

@Entity('telegram_answers')
export class TelegramAnswer extends BaseEntity {
  @Column()
  @Index()
  messageId: string; // Telegram message ID

  @Column()
  @Index()
  testId: number; // Reference to test or exam

  @Column()
  questionNumber: number; // Question number in the test

  @Column()
  answerText: string; // Student's answer

  @Column({
    type: 'enum',
    enum: AnswerStatus,
    default: AnswerStatus.PENDING
  })
  status: AnswerStatus;

  @Column({ nullable: true })
  isCorrect: boolean; // Result of checking

  @Column({ nullable: true })
  correctAnswer: string; // What the correct answer was

  @Column({ nullable: true })
  points: number; // Points earned for this answer

  @Column({ type: 'timestamp', nullable: true })
  checkedAt: Date;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  submittedAt: Date;

  @Column({ type: 'json', nullable: true })
  metadata: any; // Additional data from Telegram message

  // Relations
  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  student: User;

  @ManyToOne(() => TelegramChat, { onDelete: 'CASCADE' })
  chat: TelegramChat;
}