import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
} from 'typeorm';
import { MonthlyPayment } from './monthly-payment.entity';
import { User } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';

@Entity('monthly_payment_transactions')
export class MonthlyPaymentTransaction {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  monthlyPaymentId: number;

  @ManyToOne(() => MonthlyPayment, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'monthlyPaymentId' })
  monthlyPayment: MonthlyPayment;

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

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  amount: number;

  @Column({ type: 'text', nullable: true })
  note: string | null;

  @Column({ type: 'timestamp', default: () => 'now()' })
  paidAt: Date;

  @Column({ nullable: true })
  createdByUserId: number | null;

  @ManyToOne(() => User, { onDelete: 'SET NULL' })
  @JoinColumn({ name: 'createdByUserId' })
  createdByUser: User | null;

  @CreateDateColumn()
  createdAt: Date;
}
