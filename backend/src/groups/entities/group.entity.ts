import { Column, Entity, JoinTable, ManyToMany, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Center } from '../../centers/entities/center.entity';
import { Subject } from '../../subjects/entities/subject.entity';

@Entity('groups')
export class Group extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @ManyToOne(() => Subject, { nullable: true, onDelete: 'SET NULL' })
  subject: Subject | null;

  @ManyToOne(() => User, { nullable: false, onDelete: 'CASCADE' })
  teacher: User;

  @ManyToOne(() => Center, { nullable: false, onDelete: 'CASCADE' })
  center: Center;

  @ManyToMany(() => User, (user) => user.groups)
  @JoinTable({
    name: 'group_students',
    joinColumn: { name: 'groupId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'studentId', referencedColumnName: 'id' },
  })
  students: User[];

  // schedule
  @Column('text', { array: true, default: '{}' })
  daysOfWeek: string[]; // e.g. ['monday','wednesday']

  @Column({ type: 'varchar', length: 5 })
  startTime: string; // HH:mm

  @Column({ type: 'varchar', length: 5 })
  endTime: string; // HH:mm
}
