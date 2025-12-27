import {
  Column,
  Entity,
  JoinColumn,
  OneToOne,
  PrimaryColumn,
  CreateDateColumn,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';

@Entity('student_billing_profiles')
export class StudentBillingProfile {
  @PrimaryColumn()
  studentId: number;

  @OneToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  // Default: student's createdAt date (set in service / migration)
  @Column({ type: 'date' })
  joinDate: Date;

  // Optional: student left date (membership ended)
  @Column({ type: 'date', nullable: true })
  leaveDate: Date | null;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  monthlyAmount: number;

  // 1..31 (clamped per month length when computing dueDate)
  @Column({ type: 'int', default: 1 })
  dueDay: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
