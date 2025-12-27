import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';

export enum MonthlyPaymentStatus {
  PENDING = 'pending',
  PAID = 'paid',
  OVERDUE = 'overdue',
  CANCELLED = 'cancelled',
}

@Entity('monthly_payments')
export class MonthlyPayment {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  centerId: number;

  @ManyToOne(() => Center, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'centerId' })
  center: Center;

  // First day of month (e.g. 2025-12-01)
  @Column({ type: 'date' })
  billingMonth: Date;

  @Column({ type: 'date' })
  dueDate: Date;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amountDue: number;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amountPaid: number;

  @Column({
    type: 'enum',
    enum: MonthlyPaymentStatus,
    default: MonthlyPaymentStatus.PENDING,
  })
  status: MonthlyPaymentStatus;

  @Column({ type: 'timestamp', nullable: true })
  lastPaymentAt: Date | null;

  @Column({ type: 'timestamp', nullable: true })
  paidAt: Date | null;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
