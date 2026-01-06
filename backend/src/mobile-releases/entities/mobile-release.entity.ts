import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';

export enum MobileReleasePlatform {
  ANDROID = 'android',
  IOS = 'ios',
}

@Entity('mobile_releases')
@Index(['platform', 'version'], { unique: true })
export class MobileRelease extends BaseEntity {
  @Column({ type: 'enum', enum: MobileReleasePlatform })
  platform: MobileReleasePlatform;

  @Column({ type: 'varchar' })
  version: string;

  @Column({ type: 'varchar' })
  originalFileName: string;

  @Column({ type: 'varchar' })
  archiveFileName: string;

  // Stored under backend/public/uploads/mobile-releases/
  @Column({ type: 'varchar' })
  archiveRelativePath: string;

  @Column({ type: 'bigint', default: 0 })
  archiveSizeBytes: number;

  @Column({ type: 'varchar', nullable: true })
  uploadedByRole?: string;

  @Column({ type: 'int', nullable: true })
  uploadedByUserId?: number;
}
