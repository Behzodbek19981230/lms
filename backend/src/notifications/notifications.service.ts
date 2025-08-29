import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, In } from 'typeorm';
import { Notification, NotificationType, NotificationPriority } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private readonly notifRepo: Repository<Notification>,
    @InjectRepository(User)
    private readonly userRepo: Repository<User>,
  ) {}

  async listMy(user: User): Promise<Notification[]> {
    return this.notifRepo.find({ 
      where: { user: { id: user.id } }, 
      order: { createdAt: 'DESC' },
      take: 50 // Limit to last 50 notifications
    });
  }

  async markRead(id: number, user: User): Promise<Notification> {
    const notif = await this.notifRepo.findOne({ where: { id }, relations: ['user'] });
    if (!notif || notif.user.id !== user.id) throw new NotFoundException('Notification topilmadi');
    notif.isRead = true;
    return this.notifRepo.save(notif);
  }

  async markAllRead(user: User): Promise<void> {
    await this.notifRepo.update(
      { user: { id: user.id }, isRead: false },
      { isRead: true }
    );
  }

  async createFor(
    user: User, 
    title: string, 
    message?: string, 
    type: NotificationType = NotificationType.SYSTEM,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    metadata?: any
  ) {
    const notif = this.notifRepo.create({ 
      title, 
      message: message || null, 
      user, 
      type,
      priority,
      metadata: metadata || null
    });
    return this.notifRepo.save(notif);
  }

  async createForUsers(
    userIds: number[],
    title: string,
    message?: string,
    type: NotificationType = NotificationType.SYSTEM,
    priority: NotificationPriority = NotificationPriority.MEDIUM,
    metadata?: any
  ) {
    const users = await this.userRepo.find({
      where: { id: In(userIds) }
    });

    const notifications = users.map(user => 
      this.notifRepo.create({
        title,
        message: message || null,
        user,
        type,
        priority,
        metadata: metadata || null
      })
    );

    return this.notifRepo.save(notifications);
  }

  async createExamNotification(examId: number, examTitle: string, studentIds: number[]) {
    return this.createForUsers(
      studentIds,
      'Yangi imtihon mavjud',
      `${examTitle} imtihoni uchun tayyor`,
      NotificationType.EXAM,
      NotificationPriority.HIGH,
      { examId, examTitle }
    );
  }

  async createTestNotification(testId: number, testTitle: string, studentIds: number[]) {
    return this.createForUsers(
      studentIds,
      'Yangi test tayinlandi',
      `${testTitle} testini bajarishingiz kerak`,
      NotificationType.TEST,
      NotificationPriority.MEDIUM,
      { testId, testTitle }
    );
  }

  async createGradeNotification(studentId: number, examTitle: string, score: number, maxScore: number) {
    const user = await this.userRepo.findOne({ where: { id: studentId } });
    if (!user) return;

    return this.createFor(
      user,
      'Yangi natija',
      `${examTitle} uchun natijangiz: ${score}/${maxScore}`,
      NotificationType.GRADE,
      NotificationPriority.MEDIUM,
      { examTitle, score, maxScore }
    );
  }
}
