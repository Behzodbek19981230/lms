import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
// PDF generation removed
import { Test } from '../tests/entities/test.entity';
import { Question } from '../questions/entities/question.entity';

@Injectable()
export class TestPDFGeneratorService {
  private readonly logger = new Logger(TestPDFGeneratorService.name);

  constructor(
    @InjectRepository(Test)
    private testRepository: Repository<Test>,
    @InjectRepository(Question)
    private questionRepository: Repository<Question>,
  ) {}
}
