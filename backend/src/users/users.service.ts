import { Injectable, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { User } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Center } from 'src/centers/entities/center.entity';
import { CreateUserDto } from './dto/create-user.dto';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Center)
    private centerRepository: Repository<Center>,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    const center = dto.centerId
      ? await this.centerRepository.findOne({ where: { id: dto.centerId } })
      : undefined;

    const user = this.userRepository.create(
      center ? { ...dto, center } : { ...dto },
    );
    return this.userRepository.save(user);
  }

  async findAll(centerId?: string): Promise<User[]> {
    const where = centerId ? { center: { id: Number(centerId) } } : {};
    return await this.userRepository.find({
      where,
      relations: ['center', 'subjects'],
    });
  }

  async findOne(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['center', 'subjects'],
    });
    if (!user) {
      throw new NotFoundException('Foydalanuvchi topilmadi');
    }
    return user;
  }

  async update(id: number, dto: Partial<CreateUserDto>): Promise<User> {
    const user = await this.findOne(id);
    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async delete(id: number): Promise<void> {
    const user = await this.findOne(id);
    await this.userRepository.remove(user);
  }
}
