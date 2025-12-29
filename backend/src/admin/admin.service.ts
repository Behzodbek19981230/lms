import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User, UserRole } from '../users/entities/user.entity';
import { Center } from '../centers/entities/center.entity';

@Injectable()
export class AdminService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    @InjectRepository(Center)
    private readonly centerRepository: Repository<Center>,
  ) {}

  async getDashboardStats() {
    const [totalCenters, totalUsers, activeStudents] = await Promise.all([
      this.centerRepository.count(),
      this.userRepository.count(),
      this.userRepository.count({ where: { role: UserRole.STUDENT } }),
    ]);

    // Monthly revenue - for now hardcoded, can be implemented later with payments
    const monthlyRevenue = 0;

    return {
      totalCenters,
      totalUsers,
      monthlyRevenue,
      activeStudents,
    };
  }
}
