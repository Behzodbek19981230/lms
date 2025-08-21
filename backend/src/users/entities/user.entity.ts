import { Column, Entity, JoinTable, ManyToMany, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Test } from '../../tests/entities/test.entity';

export enum UserRole {
  TEACHER = 'teacher',
  STUDENT = 'student',
  SUPERADMIN = 'superadmin',
  ADMIN = 'admin',
}

@Entity('users')
export class User extends BaseEntity {
  @Column({ unique: true })
  email: string;

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
