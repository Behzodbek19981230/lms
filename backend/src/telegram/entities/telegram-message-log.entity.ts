import { Column, Entity, Index, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Center } from '../../centers/entities/center.entity';

export enum MessageType {
  EXAM_START = 'exam_start',
  ATTENDANCE = 'attendance',
  RESULTS = 'results',
  PAYMENT = 'payment',
  ANNOUNCEMENT = 'announcement',
  TEST_DISTRIBUTION = 'test_distribution',
}

export enum MessageStatus {
  PENDING = 'pending',
  SENT = 'sent',
  FAILED = 'failed',
  RETRYING = 'retrying',
}

export enum MessagePriority {
  HIGH = 'high',
  NORMAL = 'normal',
  LOW = 'low',
}

@Entity('telegram_message_logs')
export class TelegramMessageLog extends BaseEntity {
  @Column()
  @Index()
  chatId: string;

  @Column({ nullable: true })
  @Index()
  centerId?: number;

  @ManyToOne(() => Center, { nullable: true })
  @JoinColumn({ name: 'centerId' })
  center?: Center;

  @Column({
    type: 'enum',
    enum: MessageType,
  })
  @Index()
  messageType: MessageType;

  @Column('text')
  content: string;

  @Column({
    type: 'enum',
    enum: MessageStatus,
    default: MessageStatus.PENDING,
  })
  @Index()
  status: MessageStatus;

  @Column({
    type: 'enum',
    enum: MessagePriority,
    default: MessagePriority.NORMAL,
  })
  priority: MessagePriority;

  @Column({ nullable: true })
  telegramMessageId?: string; // Message ID returned by Telegram after successful send

  @Column({ type: 'int', default: 0 })
  retryCount: number;

  @Column({ type: 'text', nullable: true })
  error?: string; // Error message if failed

  @Column({ type: 'jsonb', nullable: true })
  metadata?: any; // Additional context (examId, groupId, etc.)

  @Column({ type: 'timestamp', nullable: true })
  sentAt?: Date;

  @Column({ type: 'timestamp', nullable: true })
  nextRetryAt?: Date; // When to retry if failed

  // Helper method to check if message can be retried
  canRetry(): boolean {
    return this.retryCount < 3 && this.status === MessageStatus.FAILED;
  }

  // Helper method to calculate next retry time with exponential backoff
  calculateNextRetry(): Date {
    const baseDelay = 60000; // 1 minute
    const exponentialDelay = baseDelay * Math.pow(2, this.retryCount);
    return new Date(Date.now() + exponentialDelay);
  }
}
