import { ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import type { Repository } from 'typeorm';
import { AssignedTest, AssignedTestVariant } from './entities/assigned-test.entity';
import { Test } from '../tests/entities/test.entity';
import { Group } from '../groups/entities/group.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Question } from '../questions/entities/question.entity';

interface GenerateDto {
  baseTestId: number;
  groupId: number;
  numQuestions: number;
  shuffleAnswers?: boolean;
  title?: string;
}

@Injectable()
export class AssignedTestsService {
  constructor(
    @InjectRepository(AssignedTest) private assignedRepo: Repository<AssignedTest>,
    @InjectRepository(AssignedTestVariant) private variantRepo: Repository<AssignedTestVariant>,
    @InjectRepository(Test) private testRepo: Repository<Test>,
    @InjectRepository(Group) private groupRepo: Repository<Group>,
    @InjectRepository(User) private userRepo: Repository<User>,
    @InjectRepository(Question) private questionRepo: Repository<Question>,
  ) {}

  async generate(dto: GenerateDto, teacherId: number) {
    const teacher = await this.userRepo.findOne({ where: { id: teacherId }, relations: ['center'] });
    if (!teacher || teacher.role !== UserRole.TEACHER) throw new ForbiddenException('Faqat o\'qituvchi');

    const [test, group] = await Promise.all([
      this.testRepo.findOne({ where: { id: dto.baseTestId }, relations: ['subject', 'teacher'] }),
      this.groupRepo.findOne({ where: { id: dto.groupId }, relations: ['center', 'students'] }),
    ]);
    if (!test) throw new NotFoundException('Asosiy test topilmadi');
    if (!group) throw new NotFoundException('Guruh topilmadi');
    if (!teacher.center || group.center?.id !== teacher.center.id) throw new ForbiddenException('Ruxsat yo\'q');

    const allQuestions = await this.questionRepo.find({ where: { test: { id: test.id } }, relations: ['answers'] });
    if (!allQuestions.length) throw new NotFoundException('Testda savollar yo\'q');

    const pickNRandom = <T,>(arr: T[], n: number): T[] => {
      const copy = [...arr];
      for (let i = copy.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [copy[i], copy[j]] = [copy[j], copy[i]];
      }
      return copy.slice(0, Math.min(n, copy.length));
    };
    const shuffleIndexes = (len: number): number[] => {
      const idx = [...Array(len).keys()];
      for (let i = idx.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [idx[i], idx[j]] = [idx[j], idx[i]];
      }
      return idx;
    };

    const assigned = this.assignedRepo.create({
      baseTest: test,
      group,
      teacher,
      title: dto.title || `${test.title} — blok`,
      numQuestions: Math.max(1, Math.round(dto.numQuestions || 1)),
      shuffleAnswers: dto.shuffleAnswers !== false,
    });
    const savedAssigned = await this.assignedRepo.save(assigned);

    let variantNumber = 1;
    for (const student of group.students || []) {
      const qs = pickNRandom(allQuestions, assigned.numQuestions);
      const payload = { questions: [] as any[] };
      for (const q of qs) {
        const entry: any = { questionId: q.id };
        if (assigned.shuffleAnswers && q.answers && q.answers.length > 1) {
          const order = shuffleIndexes(q.answers.length);
          entry.answerOrder = order;
          const correctIndex = q.answers.findIndex((a) => a.isCorrect);
          if (correctIndex >= 0) entry.correctIndex = order.indexOf(correctIndex);
        }
        payload.questions.push(entry);
      }
      const variant = this.variantRepo.create({ assignedTest: savedAssigned, student, variantNumber: variantNumber++, payload });
      await this.variantRepo.save(variant);
    }

    return { id: savedAssigned.id };
  }
}
