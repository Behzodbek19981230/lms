import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum LogLevel {
  LOG = 'log',
  ERROR = 'error',
  WARN = 'warn',
  DEBUG = 'debug',
  VERBOSE = 'verbose',
}

export enum AnalyticsEventType {
  LOGIN = 'login',
  PAGE_VIEW = 'page_view',
}

@Entity('logs')
export class Log extends BaseEntity {
  @Column({
    type: 'enum',
    enum: LogLevel,
    default: LogLevel.LOG,
  })
  level: LogLevel;

  @Column({ type: 'text' })
  message: string;

  @Column({ type: 'varchar', length: 255, nullable: true })
  context: string;

  @Column({ type: 'int', nullable: true })
  userId: number;

  @Column({ type: 'varchar', length: 255, nullable: true })
  userAgent: string;

  @Column({ type: 'varchar', length: 45, nullable: true })
  ip: string;

  /**
   * Optional analytics fields (structured).
   * When set, this log row can be used for analytics dashboards.
   */
  @Column({ type: 'varchar', length: 32, nullable: true })
  eventType?: AnalyticsEventType;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  path?: string;

  @Column({ type: 'varchar', length: 16, nullable: true })
  method?: string;

  @Column({ type: 'varchar', length: 1024, nullable: true })
  referrer?: string;

  @Column({ type: 'varchar', length: 32, nullable: true })
  deviceType?: string; // mobile | desktop | tablet | bot | unknown

  @Column({ type: 'varchar', length: 64, nullable: true })
  browser?: string;

  @Column({ type: 'varchar', length: 64, nullable: true })
  os?: string;
}
