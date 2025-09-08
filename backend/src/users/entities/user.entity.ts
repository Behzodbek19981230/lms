import {
  Column,
  Entity,
  JoinTable,
  ManyToMany,
  OneToMany,
  ManyToOne,
} from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Test } from '../../tests/entities/test.entity';
import { Center } from 'src/centers/entities/center.entity';

export enum UserRole {
  TEACHER = 'teacher',
  STUDENT = 'student',
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  username: string;

  @Column()
  password: string;

  @Column()
  firstName: string;

  @Column()
  lastName: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'enum',
    enum: UserRole,
    default: UserRole.TEACHER,
  })
  role: UserRole;

  @Column({ default: true })
  isActive: boolean;

  @Column({ type: 'timestamp', nullable: true })
  lastLoginAt: Date;

  @Column({ type: 'varchar', nullable: true })
  telegramId: string | null;

  @Column({ default: false })
  telegramConnected: boolean;

  @ManyToOne(() => Center, (center) => center.users, {
    nullable: true,
    onDelete: 'CASCADE',
  })
  center: Center;

  // Only for teachers - subjects they teach
  @ManyToMany(() => Subject, (subject) => subject.teachers)
  @JoinTable({
    name: 'user_subjects',
    joinColumn: { name: 'userId', referencedColumnName: 'id' },
    inverseJoinColumn: { name: 'subjectId', referencedColumnName: 'id' },
  })
  subjects: Subject[];

  // Only for teachers - tests they created
  @OneToMany(() => Test, (test) => test.teacher)
  tests: Test[];

  get fullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  get isTeacher(): boolean {
    return this.role === UserRole.TEACHER;
  }

  get isStudent(): boolean {
    return this.role === UserRole.STUDENT;
  }

  get isAdmin(): boolean {
    return this.role === UserRole.ADMIN;
  }
  get isSuperAdmin(): boolean {
    return this.role === UserRole.SUPERADMIN;
  }
}
