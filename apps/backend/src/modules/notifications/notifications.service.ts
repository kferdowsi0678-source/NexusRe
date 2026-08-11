import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Notification, NotificationType } from './entities/notification.entity';
import { User } from '../users/entities/user.entity';

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification)
    private notificationsRepository: Repository<Notification>,
    @InjectRepository(User)
    private usersRepository: Repository<User>,
  ) {}

  async notifyUser(
    userId: string,
    type: NotificationType | string,
    title: string,
    body?: string,
    data?: any,
  ): Promise<Notification> {
    const notification = this.notificationsRepository.create({
      userId,
      type: type as NotificationType,
      title,
      body,
      data,
    });
    return this.notificationsRepository.save(notification);
  }

  /**
   * Fans out to every active member of an organization. Notification delivery
   * must never break the action that triggered it, so failures are swallowed.
   */
  async notifyOrganization(
    organizationId: string,
    type: NotificationType | string,
    title: string,
    body?: string,
    data?: any,
    excludeUserId?: string,
  ): Promise<number> {
    try {
      const users = await this.usersRepository.find({
        where: { organizationId, isActive: true },
        select: ['id'],
      });
      const recipients = users.filter((u) => u.id !== excludeUserId);
      if (!recipients.length) return 0;

      const rows = recipients.map((u) =>
        this.notificationsRepository.create({
          userId: u.id,
          type: type as NotificationType,
          title,
          body,
          data,
        }),
      );
      await this.notificationsRepository.save(rows);
      return rows.length;
    } catch {
      return 0;
    }
  }

  async findForUser(userId: string, unreadOnly = false): Promise<Notification[]> {
    return this.notificationsRepository.find({
      where: unreadOnly ? { userId, isRead: false } : { userId },
      order: { createdAt: 'DESC' },
      take: 100,
    });
  }

  async unreadCount(userId: string): Promise<{ count: number }> {
    const count = await this.notificationsRepository.count({
      where: { userId, isRead: false },
    });
    return { count };
  }

  async markRead(id: string, userId: string): Promise<Notification> {
    const notification = await this.notificationsRepository.findOne({ where: { id, userId } });
    if (!notification) throw new NotFoundException('Notification not found');
    notification.isRead = true;
    return this.notificationsRepository.save(notification);
  }

  async markAllRead(userId: string): Promise<{ updated: number }> {
    const result = await this.notificationsRepository.update(
      { userId, isRead: false },
      { isRead: true },
    );
    return { updated: result.affected ?? 0 };
  }
}
