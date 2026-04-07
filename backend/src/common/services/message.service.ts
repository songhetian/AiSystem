import { Injectable } from '@nestjs/common';
import { Prisma, PrismaClient } from '@prisma/client';
import { PrismaService } from '../../prisma/prisma.service';
import { RealtimeService } from './realtime.service';

type PrismaWriteClient = PrismaService | Prisma.TransactionClient | PrismaClient;

interface SendMessageInput {
  recipientId: string;
  title: string;
  content: string;
  messageType: string;
  bizType?: string;
  bizId?: string;
  route?: string;
  senderId?: string;
  senderName?: string;
  payload?: Record<string, unknown>;
}

@Injectable()
export class MessageService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly realtimeService: RealtimeService
  ) {}

  async send(input: SendMessageInput, client?: PrismaWriteClient) {
    const delegate = (client ?? this.prisma) as any;
    const message = await delegate.sys_message.create({
      data: {
        recipient_id: input.recipientId,
        title: input.title,
        content: input.content,
        message_type: input.messageType,
        biz_type: input.bizType,
        biz_id: input.bizId,
        route: input.route,
        sender_id: input.senderId,
        sender_name: input.senderName,
        payload: input.payload as Prisma.InputJsonValue | undefined
      }
    });

    this.realtimeService.emitToUser(input.recipientId, 'system-message.changed', {
      action: 'created',
      messageId: message.id,
      messageType: input.messageType,
      bizType: input.bizType,
      bizId: input.bizId,
      route: input.route
    });

    return message;
  }
}
