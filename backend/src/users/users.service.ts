import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import type { Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
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

    // If role is ADMIN/TEACHER/STUDENT, ensure a center is attached
    if (
      (!center || !center.id) &&
      dto.role &&
      dto.role !== UserRole.SUPERADMIN
    ) {
      throw new BadRequestException('Admin, teacher va student uchun centerId majburiy');
    }

    const user = this.userRepository.create(
      center ? { ...dto, center } : { ...dto },
    );
    return this.userRepository.save(user);
  }

  async findAll(centerId?: string, role?: string, includeGroups?: boolean, includeSubjects?: boolean): Promise<User[]> {
    const where: any = {};
    if (centerId) where.center = { id: Number(centerId) };
    if (role) where.role = role as UserRole;
    
    const relations: string[] = ['center'];
    if (includeSubjects !== false) relations.push('subjects');
    // Add groups relation if needed - this would require setting up the relationship
    
    return await this.userRepository.find({
      where,
      relations,
      order: { createdAt: 'DESC' },
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

  async findById(id: number): Promise<User> {
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
