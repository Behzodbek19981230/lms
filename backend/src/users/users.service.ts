import { Injectable, NotFoundException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
  ) {}

  async findByEmail(email: string): Promise<User | null> {
    return this.userRepository.findOne({
      where: { email },
      relations: ['subjects', 'tests'],
    });
  }

  async findById(id: number): Promise<User> {
    const user = await this.userRepository.findOne({
      where: { id },
      relations: ['subjects', 'tests'],
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async create(userData: Partial<User>): Promise<User> {
    const user = this.userRepository.create(userData);
    return this.userRepository.save(user);
  }

  async update(id: number, userData: Partial<User>): Promise<User> {
    await this.userRepository.update(id, userData);
    return this.findById(id);
  }

  async findTeachers(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.TEACHER },
      relations: ['subjects', 'tests'],
    });
  }

  async findStudents(): Promise<User[]> {
    return this.userRepository.find({
      where: { role: UserRole.STUDENT },
    });
  }
}
