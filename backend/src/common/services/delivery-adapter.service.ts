import { Injectable, Logger } from '@nestjs/common';
import { RealtimeService } from './realtime.service';

export enum DeliveryChannel {
  INTERNAL = 'internal',
  SMS = 'sms',
  EMAIL = 'email',
}

export interface DeliveryInput {
  recipientId: string;
  title: string;
  content: string;
  channels: DeliveryChannel[];
  payload?: any;
}

/**
 * 消息分发自适应服务 (PRD 2.1.1)
 * 负责根据模板配置将消息分发至不同物理通道
 */
@Injectable()
export class DeliveryAdapterService {
  private readonly logger = new Logger(DeliveryAdapterService.name);

  constructor(private readonly realtimeService: RealtimeService) {}

  async deliver(input: DeliveryInput) {
    const results: Array<{ channel: DeliveryChannel; success: boolean; error?: string }> = [];

    for (const channel of input.channels) {
      try {
        let success = false;
        switch (channel) {
          case DeliveryChannel.INTERNAL:
            success = await this.deliverInternal(input);
            break;
          case DeliveryChannel.SMS:
            success = await this.deliverSms(input);
            break;
          case DeliveryChannel.EMAIL:
            success = await this.deliverEmail(input);
            break;
        }
        results.push({ channel, success });
      } catch (error) {
        const errorMessage = error instanceof Error ? error.message : String(error);
        const errorStack = error instanceof Error ? error.stack : undefined;
        this.logger.error(`Channel ${channel} delivery failed`, errorStack);
        results.push({ channel, success: false, error: errorMessage });
      }
    }

    return results;
  }

  private async deliverInternal(input: DeliveryInput) {
    this.realtimeService.emitToUser(input.recipientId, 'system-message.new', {
      title: input.title,
      content: input.content,
      payload: input.payload,
    });
    return true;
  }

  private async deliverSms(input: DeliveryInput) {
    this.logger.warn(`[SMS DISABLED] recipient=${input.recipientId}, contentLength=${input.content.length}`);
    return false;
  }

  private async deliverEmail(input: DeliveryInput) {
    this.logger.warn(`[EMAIL DISABLED] recipient=${input.recipientId}, title=${input.title}`);
    return false;
  }
}
