import { Entity, Column, ManyToOne, JoinColumn } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { GeneratedTestVariant } from './generated-test.entity';

@Entity('scanned_grades')
export class ScannedGrade extends BaseEntity {
  @ManyToOne(() => GeneratedTestVariant, { nullable: false, onDelete: 'CASCADE' })
  @JoinColumn({ name: 'variantId' })
  variant: GeneratedTestVariant;

  @Column({ type: 'json' })
  answers: string[];

  @Column({ type: 'json' })
  result: any;

  @Column({ type: 'varchar', length: 64, nullable: true })
  source?: string;
}
