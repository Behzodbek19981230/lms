import { Column, Entity, ManyToOne, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { User } from '../../users/entities/user.entity';
import { Center } from '../../centers/entities/center.entity';
import { Subject } from '../../subjects/entities/subject.entity';
import { Group } from '../../groups/entities/group.entity';

export enum ChatType {
  CHANNEL = 'channel', // For sending tests and results
  PRIVATE = 'private', // For receiving answers
  GROUP = 'group', // For group discussions
}

export enum ChatStatus {
  ACTIVE = 'active',
  BLOCKED = 'blocked',
  INACTIVE = 'inactive',
  PENDING = 'pending',
}

@Entity('telegram_chats')
export class TelegramChat extends BaseEntity {
  @Column({ unique: true })
  @Index()
  chatId: string; // Telegram chat ID

  @Column({
    type: 'enum',
    enum: ChatType,
    default: ChatType.PRIVATE,
  })
  type: ChatType;

  @Column({
    type: 'enum',
    enum: ChatStatus,
    default: ChatStatus.ACTIVE,
  })
  status: ChatStatus;

  @Column({ nullable: true })
  title: string; // Chat/Channel title

  @Column({ nullable: true })
  username: string; // Chat/Channel username (@username)

  @Column({ nullable: true })
  telegramUserId: string; // User's Telegram ID

  @Column({ nullable: true })
  firstName: string;

  @Column({ nullable: true })
  lastName: string;

  @Column({ nullable: true })
  telegramUsername: string; // User's Telegram username

  @Column({ default: false })
  isBot: boolean;

  @Column({ type: 'json', nullable: true })
  metadata: any; // Additional Telegram-specific data

  // Link to our system user
  @ManyToOne(() => User, { nullable: true, onDelete: 'CASCADE' })
  user: User | null;

  // Link to center (for channels/groups associated with specific centers)
  @ManyToOne(() => Center, { nullable: true, onDelete: 'CASCADE' })
  center: Center | null;

  // Link to subject (for channels associated with specific subjects)
  @ManyToOne(() => Subject, { nullable: true, onDelete: 'CASCADE' })
  subject: Subject | null;

  // Link to group (for channels associated with specific groups)
  // This provides more granular control than subject-level mapping
  @ManyToOne(() => Group, { nullable: true, onDelete: 'CASCADE' })
  group: Group | null;

  // For channels/groups - store invitation link
  @Column({ nullable: true })
  inviteLink: string;

  // Last activity timestamp
  @Column({ type: 'timestamp', nullable: true })
  lastActivity: Date;

  // Virtual properties for API responses
  get centerName(): string | undefined {
    return this.center?.name;
  }

  get subjectName(): string | undefined {
    return this.subject?.name;
  }

  get groupName(): string | undefined {
    return this.group?.name;
  }

  // Transform for JSON serialization
  toJSON() {
    return {
      ...this,
      centerName: this.centerName,
      subjectName: this.subjectName,
      groupName: this.groupName,
      centerId: this.center?.id,
      subjectId: this.subject?.id,
      groupId: this.group?.id,
    };
  }
}
