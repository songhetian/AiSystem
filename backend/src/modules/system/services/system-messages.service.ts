import { Injectable, NotFoundException } from '@nestjs/common';
import { RealtimeService } from '../../../common/services/realtime.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { QuerySystemMessagesDto } from '../dto/query-system-messages.dto';

@Injectable()
export class SystemMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService
  ) {}

  private get messageDelegate() {
    return (this.prisma as any).sys_message;
  }

  async list(userId: string, query: QuerySystemMessagesDto) {
    return this.messageDelegate.findMany({
      where: {
        is_deleted: 0,
        recipient_id: userId,
        ...(query.read_status !== undefined ? { read_status: query.read_status } : {}),
        ...(query.keyword
          ? {
              OR: [
                { title: { contains: query.keyword } },
                { content: { contains: query.keyword } }
              ]
            }
          : {})
      },
      orderBy: { create_time: 'desc' }
    });
  }

  async stats(userId: string) {
    const unreadCount = await this.messageDelegate.count({
      where: {
        is_deleted: 0,
        recipient_id: userId,
        read_status: 0
      }
    });

    return { unreadCount };
  }

  async markRead(userId: string, id: string) {
    const current = await this.messageDelegate.findFirst({
      where: { id, recipient_id: userId, is_deleted: 0 }
    });

    if (!current) {
      throw new NotFoundException('消息不存在');
    }

    if (current.read_status === 1) {
      return current;
    }

    const updated = await this.messageDelegate.update({
      where: { id },
      data: {
        read_status: 1,
        read_time: new Date()
      }
    });

    this.realtimeService.emitToUser(userId, 'system-message.changed', {
      action: 'read',
      messageId: id
    });

    return updated;
  }

  async markAllRead(userId: string) {
    const result = await this.messageDelegate.updateMany({
      where: {
        recipient_id: userId,
        is_deleted: 0,
        read_status: 0
      },
      data: {
        read_status: 1,
        read_time: new Date()
      }
    });

    this.realtimeService.emitToUser(userId, 'system-message.changed', {
      action: 'read-all',
      updated: result.count
    });

    return { updated: result.count };
  }
}
