import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  ManyToOne,
  JoinColumn,
} from 'typeorm';
import { User } from '../../users/entities/user.entity';
import { Center } from '../../centers/entities/center.entity';

@Entity('results')
export class Results {
  @PrimaryGeneratedColumn()
  id: number;

  @Column({ nullable: true })
  student_id?: number;

  @ManyToOne(() => User, { nullable: true })
  @JoinColumn({ name: 'student_id' })
  student?: User;

  @Column({ nullable: true })
  center_id?: number;

  @ManyToOne(() => Center, { nullable: true })
  @JoinColumn({ name: 'center_id' })
  center?: Center;

  @Column()
  uniqueNumber: string;

  @Column('int')
  total: number;

  @Column('int')
  correctCount: number;

  @Column('int')
  wrongCount: number;

  @Column('int')
  blankCount: number;

  @Column('json')
  perQuestion: any;

  @Column({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;
}
