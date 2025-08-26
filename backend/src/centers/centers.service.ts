import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from './entities/center.entity';
import { User, UserRole } from '../users/entities/user.entity';

@Injectable()
export class CentersService {
  constructor(
    @InjectRepository(Center)
    private readonly centerRepo: Repository<Center>,
  ) {}

  async findAll(user: User): Promise<Center[]> {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException(
        'Faqat superadmin barcha markazlarni ko‘rishi mumkin',
      );
    }
    return this.centerRepo.find({ relations: ['users', 'subjects'] });
  }

  async findOne(id: number, user: User): Promise<Center> {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException(
        'Faqat superadmin boshqa markazni ko‘rishi mumkin',
      );
    }
    const center = await this.centerRepo.findOne({
      where: { id },
      relations: ['users', 'subjects'],
    });
    if (!center) throw new NotFoundException('Markaz topilmadi');
    return center;
  }

  async create(dto: Partial<Center>, user: User): Promise<Center> {
    console.log('User ID:', user.role);

    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException(
        'Faqat superadmin yangi markaz qo‘sha oladi',
      );
    }
    const center = this.centerRepo.create(dto);
    return this.centerRepo.save(center);
  }

  async update(id: number, dto: Partial<Center>, user: User): Promise<Center> {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Faqat superadmin tahrirlaydi');
    }
    await this.findOne(id, user);
    await this.centerRepo.update(id, dto);
    return this.findOne(id, user);
  }

  async remove(id: number, user: User): Promise<void> {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Faqat superadmin o‘chira oladi');
    }
    await this.findOne(id, user);
    await this.centerRepo.delete(id);
  }
}
