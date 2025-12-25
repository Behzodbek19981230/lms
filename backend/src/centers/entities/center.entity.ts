import { Column, Entity, OneToMany } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import type { CenterPermissions } from '../permissions/center-permissions';

@Entity('centers')
export class Center extends BaseEntity {
  @Column()
  name: string;

  @Column({ nullable: true })
  description: string;

  @Column({ nullable: true })
  address: string;

  @Column({ nullable: true })
  phone: string;

  @Column({
    type: 'jsonb',
    nullable: false,
    default: () => "'{}'::jsonb",
  })
  permissions: CenterPermissions;

  @OneToMany(() => User, (user) => user.center)
  users: User[];

  @OneToMany(() => Subject, (subject) => subject.center)
  subjects: Subject[];
}
