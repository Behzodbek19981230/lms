import { Column, Entity, JoinColumn, ManyToOne } from 'typeorm';
import { BaseEntity } from '../../common/entities/base.entity';
import { Question } from './question.entity';

@Entity('answers')
export class Answer extends BaseEntity {
  @Column()
  text: string;

  @Column({ default: false })
  isCorrect: boolean;

  @Column({ default: 0 })
  order: number;

  @Column({ default: false })
  hasFormula: boolean;

  @Column({ nullable: true })
  explanation: string;

  @ManyToOne(() => Question, (question) => question.answers, {
    onDelete: 'CASCADE',
  })
  @JoinColumn({ name: 'questionId' })
  question: Question;
}
