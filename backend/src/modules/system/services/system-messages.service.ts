import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { QuerySystemMessagesDto } from '../dto/query-system-messages.dto';

@Injectable()
export class SystemMessagesService {
  constructor(private readonly prisma: PrismaService) {}

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

    return this.messageDelegate.update({
      where: { id },
      data: {
        read_status: 1,
        read_time: new Date()
      }
    });
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

    return { updated: result.count };
  }
}
