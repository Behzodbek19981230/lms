import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Center } from './entities/center.entity';
import { User, UserRole } from '../users/entities/user.entity';
import { Group } from '../groups/entities/group.entity';
import { Payment } from '../payments/payment.entity';
import {
  CenterPermissions,
  getEffectiveCenterPermissions,
} from './permissions/center-permissions';

@Injectable()
export class CentersService {
  constructor(
    @InjectRepository(Center)
    private readonly centerRepo: Repository<Center>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
    @InjectRepository(Group)
    private readonly groupRepo: Repository<Group>,
    @InjectRepository(Payment)
    private readonly paymentRepo: Repository<Payment>,
  ) {}

  async findAll(user: User): Promise<Center[]> {
    if (user.role === UserRole.SUPERADMIN) {
      // Superadmins can see all centers with their users and subjects
      return this.centerRepo
        .createQueryBuilder('center')
        .leftJoinAndSelect('center.users', 'user', 'user.centerId = center.id')
        .leftJoinAndSelect(
          'center.subjects',
          'subject',
          'subject.centerId = center.id',
        )
        .getMany();
    } else if (user.role === UserRole.ADMIN || user.role === UserRole.TEACHER) {
      // Teachers and admins can only see their own center
      if (!user.center) {
        console.warn(
          `User ${user.id} (${user.role}) does not have a center assigned`,
        );
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
        "Markazlarni ko'rish uchun ruxsatingiz yo'q",
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
    if (typeof (dto as any).phone === 'string')
      allowed.phone = (dto as any).phone;
    if (typeof (dto as any).isActive === 'boolean')
      allowed.isActive = (dto as any).isActive;

    await this.centerRepo.update(id, allowed);
    return this.findOne(id, user);
  }

  async updateStatus(
    id: number,
    isActive: boolean,
    user: User,
  ): Promise<Center> {
    if (user.role !== UserRole.SUPERADMIN) {
      throw new ForbiddenException(
        'Faqat superadmin markaz holatini o‘zgartiradi',
      );
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

  async getCenterStats(centerId: number, user: User) {
    if (user.role === UserRole.SUPERADMIN) {
      const center = await this.centerRepo.findOne({ where: { id: centerId } });
      if (!center) throw new NotFoundException('Markaz topilmadi');
    } else if (user.role === UserRole.ADMIN || user.role === UserRole.TEACHER) {
      if (!user.center || !user.center.id) {
        throw new ForbiddenException('Markazga biriktirilmagansiz');
      }
      if (Number(user.center.id) !== Number(centerId)) {
        throw new ForbiddenException(
          "Faqat o'z markazingiz statistikalarini ko'ra olasiz",
        );
      }
      if ((user.center as any).isActive === false) {
        throw new ForbiddenException('Markaz nofaol');
      }
    } else {
      throw new ForbiddenException(
        "Markaz statistikalarini ko'rish uchun ruxsatingiz yo'q",
      );
    }

    const [totalGroups, totalStudents, totalTeachers, monthlyRevenue] =
      await Promise.all([
        this.groupRepo
          .createQueryBuilder('group')
          .where('group.centerId = :centerId', { centerId })
          .getCount(),
        this.userRepo
          .createQueryBuilder('user')
          .where('user.centerId = :centerId', { centerId })
          .andWhere('user.role = :role', { role: UserRole.STUDENT })
          .getCount(),
        this.userRepo
          .createQueryBuilder('user')
          .where('user.centerId = :centerId', { centerId })
          .andWhere('user.role = :role', { role: UserRole.TEACHER })
          .getCount(),
        this.paymentRepo
          .createQueryBuilder('payment')
          .leftJoin('payment.group', 'group')
          .where('group.centerId = :centerId', { centerId })
          .andWhere('payment.status = :status', { status: 'paid' })
          .andWhere(
            'EXTRACT(MONTH FROM payment.paidDate) = EXTRACT(MONTH FROM CURRENT_DATE)',
          )
          .andWhere(
            'EXTRACT(YEAR FROM payment.paidDate) = EXTRACT(YEAR FROM CURRENT_DATE)',
          )
          .select('SUM(payment.amount)', 'total')
          .getRawOne()
          .then((result) => parseFloat(result?.total || '0')),
      ]);

    // For now, active classes = total groups (simplified)
    const activeClasses = totalGroups;

    return {
      totalStudents,
      totalTeachers,
      totalGroups,
      monthlyRevenue,
      activeClasses,
    };
  }
}
