import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from './entities/center.entity';
import { User, UserRole } from '../users/entities/user.entity';
import {
  CenterPermissions,
  getEffectiveCenterPermissions,
} from './permissions/center-permissions';

@Injectable()
export class CentersService {
  constructor(
    @InjectRepository(Center)
    private readonly centerRepo: Repository<Center>,
  ) {}

  async findAll(user: User): Promise<Center[]> {
    if (user.role === UserRole.SUPERADMIN) {
      // Superadmins can see all centers
      return this.centerRepo.find({ relations: ['users', 'subjects'] });
    } else if (user.role === UserRole.ADMIN || user.role === UserRole.TEACHER) {
      // Teachers and admins can only see their own center
      if (!user.center) {
        console.warn(`User ${user.id} (${user.role}) does not have a center assigned`);
        // Return empty array instead of throwing error to allow Telegram management to work
        return [];
      }
      // If their center is inactive, treat as no access
      if ((user.center as any).isActive === false) {
        return [];
      }
      return [user.center];
    } else {
      throw new ForbiddenException(
        'Markazlarni ko\'rish uchun ruxsatingiz yo\'q',
      );
    }
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
    const center = this.centerRepo.create({
      ...dto,
      permissions: dto.permissions ?? {},
    });
    return this.centerRepo.save(center);
  }

  async update(id: number, dto: Partial<Center>, user: User): Promise<Center> {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Faqat superadmin tahrirlaydi');
    }
    await this.findOne(id, user);
    const allowed: Partial<Center> = {};
    if (typeof (dto as any).name === 'string') allowed.name = (dto as any).name;
    if (typeof (dto as any).description === 'string')
      allowed.description = (dto as any).description;
    if (typeof (dto as any).address === 'string')
      allowed.address = (dto as any).address;
    if (typeof (dto as any).phone === 'string') allowed.phone = (dto as any).phone;
    if (typeof (dto as any).isActive === 'boolean')
      allowed.isActive = (dto as any).isActive;

    await this.centerRepo.update(id, allowed);
    return this.findOne(id, user);
  }

  async updateStatus(id: number, isActive: boolean, user: User): Promise<Center> {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Faqat superadmin markaz holatini o‘zgartiradi');
    }
    await this.findOne(id, user);
    await this.centerRepo.update(id, { isActive });
    return this.findOne(id, user);
  }

  async remove(id: number, user: User): Promise<void> {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException('Faqat superadmin o‘chira oladi');
    }
    await this.findOne(id, user);
    await this.centerRepo.delete(id);
  }

  async getCenterPermissions(id: number, user: User) {
    const center = await this.findOne(id, user);
    return getEffectiveCenterPermissions(center.permissions);
  }

  async updateCenterPermissions(
    id: number,
    permissions: CenterPermissions,
    user: User,
  ) {
    const center = await this.findOne(id, user);
    center.permissions = {
      ...(center.permissions || {}),
      ...(permissions || {}),
    };
    await this.centerRepo.save(center);
    return getEffectiveCenterPermissions(center.permissions);
  }
}
