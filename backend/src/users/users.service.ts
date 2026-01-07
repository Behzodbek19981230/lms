import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { QueryFailedError, type Repository } from 'typeorm';
import { User, UserRole } from './entities/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Center } from 'src/centers/entities/center.entity';
import { CreateUserDto } from './dto/create-user.dto';
import { LogsService } from 'src/logs/logs.service';

@Injectable()
export class UsersService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Center)
    private centerRepository: Repository<Center>,

    private readonly logsService: LogsService,
  ) {}

  async create(dto: CreateUserDto): Promise<User> {
    // Username bo‘yicha tekshirish
    const existingUser = await this.userRepository.findOne({
      where: { username: dto.username },
    });

    if (existingUser) {
      throw new BadRequestException('Bunday username allaqachon mavjud');
    }

    const center = dto.centerId
      ? await this.centerRepository.findOne({ where: { id: dto.centerId } })
      : undefined;

    // Agar role ADMIN/TEACHER/STUDENT bo‘lsa centerId majburiy
    if (
      (!center || !center.id) &&
      dto.role &&
      dto.role !== UserRole.SUPERADMIN
    ) {
      throw new BadRequestException(
        'Admin, teacher va student uchun centerId majburiy',
      );
    }

    const user = this.userRepository.create(
      center ? { ...dto, center } : { ...dto },
    );
    return this.userRepository.save(user);
  }

  async findAll({
    user,
    centerId,
    includeSubjects,
    includeGroups,
    unassigned,
    role,
  }: {
    user?: User;
    centerId?: number;
    includeSubjects?: boolean;
    includeGroups?: boolean;
    unassigned?: boolean;
    role?: UserRole;
  }): Promise<User[]> {
    if (!user) {
      throw new BadRequestException("Foydalanuvchi ma'lumotlari mavjud emas");
    }

    // Base query builder
    const qb = this.userRepository
      .createQueryBuilder('user')
      .leftJoinAndSelect('user.center', 'center');

    if (includeSubjects) {
      qb.leftJoinAndSelect('user.subjects', 'subjects');
    }
    if (includeGroups) {
      qb.leftJoinAndSelect('user.groups', 'groups');
    }
    // Note: User entity has no direct 'groups' relation; avoid joining non-existent relation

    if (user.role === UserRole.SUPERADMIN) {
      // Superadmin: may view unassigned and any center
      if (unassigned) {
        qb.where('user.center IS NULL').andWhere('user.role != :superadmin', {
          superadmin: UserRole.SUPERADMIN,
        });
      } else if (centerId) {
        qb.where('center.id = :centerId', { centerId });
      }
      if (role) {
        qb.andWhere('user.role = :role', { role });
      }
      qb.orderBy('user.createdAt', 'DESC');
      return qb.getMany();
    }

    // Non-superadmin: strictly restrict to own center, ignore `unassigned`
    if (!user.center || !user.center.id) {
      // No center attached -> do not expose other users
      return [];
    }
    qb.where('center.id = :centerId', { centerId: Number(user.center.id) });

    if (role) {
      qb.andWhere('user.role = :role', { role });
    }

    qb.orderBy('user.createdAt', 'DESC');
    return qb.getMany();
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

  async assignUserToCenter(userId: number, centerId: number): Promise<User> {
    const user = await this.findOne(userId);
    const center = await this.centerRepository.findOne({
      where: { id: centerId },
    });

    if (!center) {
      throw new NotFoundException('Markaz topilmadi');
    }

    user.center = center;
    return this.userRepository.save(user);
  }

  async getTelegramStatus(userId: number) {
    const user = await this.findOne(userId);
    const isConnected =
      typeof user.telegramConnected === 'boolean'
        ? user.telegramConnected
        : false;
    return {
      isConnected,
      telegramId: user.telegramId,
      telegramUsername: user.username, // This might need to be a separate field
      firstName: user.firstName,
      lastName: user.lastName,
    };
  }

  async connectTelegram(userId: number, telegramUsername: string) {
    await this.findOne(userId);
    console.log(`Connecting user ${userId} to Telegram as ${telegramUsername}`);

    // Here you would typically:
    // 1. Create a pending connection request
    // 2. Send message to telegram bot
    // 3. Wait for user confirmation from telegram

    // For now, we'll just simulate the connection process
    return {
      success: true,
      message:
        "Telegram ulanish so'rovi yuborildi. Iltimos, bot xabarini tasdiqlang.",
      telegramUsername,
    };
  }

  async remove(id: number): Promise<{ message: string }> {
    const user = await this.findOne(id);

    try {
      await this.userRepository.remove(user);
      return { message: 'User deleted successfully' };
    } catch (err: unknown) {
      // If the user is referenced by other records (payments, attendance, tests, etc.),
      // a hard delete will fail with a FK constraint violation. In that case, fall back
      // to a safe deactivation instead of returning a 500.
      const driverCode =
        err instanceof QueryFailedError
          ? ((err as any).driverError?.code ?? (err as any).code)
          : undefined;

      // Postgres foreign key violation is 23503
      const isForeignKeyViolation = driverCode === '23503';

      if (isForeignKeyViolation) {
        user.isActive = false;
        await this.userRepository.save(user);
        return {
          message:
            'User has related records and was deactivated instead of deleted',
        };
      }

      throw err;
    }
  }
}
