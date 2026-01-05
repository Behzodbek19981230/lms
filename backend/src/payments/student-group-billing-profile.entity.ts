import {
  Column,
  CreateDateColumn,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  Unique,
  UpdateDateColumn,
} from 'typeorm';
import { User } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';

@Entity('student_group_billing_profiles')
@Unique('uq_student_group_billing_profile', ['studentId', 'groupId'])
export class StudentGroupBillingProfile {
  @PrimaryGeneratedColumn()
  id: number;

  @Column()
  studentId: number;

  @ManyToOne(() => User, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'studentId' })
  student: User;

  @Column()
  groupId: number;

  @ManyToOne(() => Group, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'groupId' })
  group: Group;

  @Column({ type: 'date' })
  joinDate: Date;

  @Column({ type: 'date', nullable: true })
  leaveDate: Date | null;

  @Column('decimal', { precision: 10, scale: 2, default: 0 })
  monthlyAmount: number;

  @Column({ type: 'int', default: 10 })
  dueDay: number;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
