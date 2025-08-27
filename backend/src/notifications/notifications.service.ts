import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
  ) {}

  async listMy(user: User): Promise<Notification[]> {
    return this.notifRepo.find({ where: { user: { id: user.id } }, order: { createdAt: 'DESC' } });
  }

  async markRead(id: number, user: User): Promise<Notification> {
    const notif = await this.notifRepo.findOne({ where: { id }, relations: ['user'] });
    if (!notif || notif.user.id !== user.id) throw new NotFoundException('Notification topilmadi');
    notif.isRead = true;
    return this.notifRepo.save(notif);
  }

  async createFor(user: User, title: string, message?: string) {
    const notif = this.notifRepo.create({ title, message: message || null, user });
    return this.notifRepo.save(notif);
  }
}
