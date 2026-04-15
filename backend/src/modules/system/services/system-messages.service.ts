import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { QuerySystemMessagesDto } from "../dto/query-system-messages.dto";
import { TemplateEngineHelper } from "../../../common/helpers/template-engine.helper";
import {
  DeliveryAdapterService,
  DeliveryChannel,
} from "../../../common/services/delivery-adapter.service";

@Injectable()
export class SystemMessagesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly templateEngine: TemplateEngineHelper,
    private readonly deliveryAdapter: DeliveryAdapterService,
  ) {}

  private get messageDelegate() {
    return (this.prisma as any).sys_message;
  }

  // --- 消息处理 (Inbox/Recycle Bin/Favorites) ---

  async list(userId: string, query: QuerySystemMessagesDto) {
    const where: any = {
      recipient_id: userId,
      ...(query.read_status !== undefined
        ? { read_status: query.read_status }
        : {}),
      ...(query.keyword
        ? {
            OR: [
              { title: { contains: query.keyword } },
              { content: { contains: query.keyword } },
            ],
          }
        : {}),
      ...(query.category
        ? { message_type: { startsWith: query.category } }
        : {}),
    };

    // 视图逻辑 (PRD 2.3.2)
    if (query.view === "deleted") {
      where.is_deleted = 1;
    } else if (query.view === "favorite") {
      where.is_deleted = 0;
      where.is_favorite = 1;
    } else {
      where.is_deleted = 0;
    }

    return this.messageDelegate.findMany({
      where,
      orderBy: { create_time: "desc" },
      take: 100, // 分页限制
    });
  }

  async stats(userId: string) {
    const [unread, favorites, deleted] = await Promise.all([
      this.messageDelegate.count({
        where: { recipient_id: userId, is_deleted: 0, read_status: 0 },
      }),
      this.messageDelegate.count({
        where: { recipient_id: userId, is_deleted: 0, is_favorite: 1 },
      }),
      this.messageDelegate.count({
        where: { recipient_id: userId, is_deleted: 1 },
      }),
    ]);

    return {
      unreadCount: unread,
      favoriteCount: favorites,
      deletedCount: deleted,
    };
  }

  async markRead(userId: string, id: string) {
    return this.messageDelegate.update({
      where: { id, recipient_id: userId },
      data: { read_status: 1, read_time: new Date() },
    });
  }

  async toggleFavorite(userId: string, id: string) {
    const msg = await this.messageDelegate.findFirst({
      where: { id, recipient_id: userId },
    });
    if (!msg) throw new NotFoundException("消息不存在");

    return this.messageDelegate.update({
      where: { id },
      data: { is_favorite: msg.is_favorite === 1 ? 0 : 1 },
    });
  }

  async moveToTrash(userId: string, ids: string[]) {
    return this.messageDelegate.updateMany({
      where: { id: { in: ids }, recipient_id: userId },
      data: { is_deleted: 1, delete_time: new Date() },
    });
  }

  async restoreFromTrash(userId: string, ids: string[]) {
    return this.messageDelegate.updateMany({
      where: { id: { in: ids }, recipient_id: userId },
      data: { is_deleted: 0, delete_time: null },
    });
  }

  async markAllRead(userId: string) {
    return this.messageDelegate.updateMany({
      where: {
        recipient_id: userId,
        is_deleted: 0,
        read_status: 0,
      },
      data: {
        read_status: 1,
        read_time: new Date(),
      },
    });
  }

  async purgeTrash(userId: string) {
    return this.messageDelegate.deleteMany({
      where: {
        recipient_id: userId,
        is_deleted: 1,
      },
    });
  }

  // --- 模板引擎与分发 (PRD 2.1 / 2.2) ---

  async sendFromTemplate(payload: {
    templateName: string;
    recipientId: string;
    variables: Record<string, any>;
    senderId?: string;
  }) {
    const template = await (this.prisma as any).sys_message_template.findUnique(
      {
        where: { name: payload.templateName, status: 1 },
      },
    );

    if (!template) throw new NotFoundException("模板不存在或已禁用");

    // 1. 渲染内容
    const renderedContent = this.templateEngine.render(
      template.content,
      payload.variables,
    );

    // 2. 内部落地 (sys_message)
    const channels = template.channels.split(",") as DeliveryChannel[];
    const msg = await this.messageDelegate.create({
      data: {
        recipient_id: payload.recipientId,
        title: template.name,
        content: renderedContent,
        message_type: template.tpl_type,
        sender_id: payload.senderId,
        read_status: 0,
      },
    });

    // 3. 多渠道分发 (PRD 2.1.1)
    await this.deliveryAdapter.deliver({
      recipientId: payload.recipientId,
      title: template.name,
      content: renderedContent,
      channels: channels,
      payload: payload.variables,
    });

    return msg;
  }

  // --- 模板管理 (PRD 2.1.3) ---

  async listTemplates(_query: any) {
    return (this.prisma as any).sys_message_template.findMany({
      where: { is_deleted: 0 },
      orderBy: { update_time: "desc" },
    });
  }

  async saveTemplate(data: any) {
    if (data.id) {
      return (this.prisma as any).sys_message_template.update({
        where: { id: data.id },
        data,
      });
    }
    return (this.prisma as any).sys_message_template.create({ data });
  }

  // ✅ 新增：消息设置（PRD 2.3.3）- 个人接收偏好与免打扰
  async getSettings(userId: string) {
    const key = `msg:settings:${userId}`;
    const cached = await (this.prisma as any)
      .$queryRawUnsafe?.(`SELECT 1`)
      .catch(() => null);
    // 从 sys_user 扩展字段或 Redis 读取设置
    const user = await this.prisma.sys_user.findUnique({
      where: { id: userId },
      select: { id: true },
    });
    if (!user) return this.defaultSettings();

    // 尝试从 sys_config 读取用户个人设置
    const setting = await (this.prisma as any).sys_config?.findFirst?.({
      where: { config_key: `user_msg_settings_${userId}` },
    });

    if (setting?.config_value) {
      try {
        return JSON.parse(setting.config_value);
      } catch {
        /* ignore */
      }
    }
    return this.defaultSettings();
  }

  async saveSettings(
    userId: string,
    settings: {
      channels?: string[]; // 接收渠道: ['system', 'sms', 'email']
      dnd_enabled?: boolean; // 是否开启免打扰
      dnd_start?: string; // 免打扰开始时间 HH:mm
      dnd_end?: string; // 免打扰结束时间 HH:mm
      dnd_allow_urgent?: boolean; // 免打扰期间是否接收紧急消息
    },
  ) {
    const merged = { ...this.defaultSettings(), ...settings };
    const key = `user_msg_settings_${userId}`;

    // 存入 sys_config（用户级配置）
    const existing = await (this.prisma as any).sys_config?.findFirst?.({
      where: { config_key: key },
    });

    if (existing) {
      await (this.prisma as any).sys_config?.update?.({
        where: { id: existing.id },
        data: { config_value: JSON.stringify(merged) },
      });
    } else {
      await (this.prisma as any).sys_config?.create?.({
        data: {
          config_key: key,
          config_value: JSON.stringify(merged),
          config_desc: `用户 ${userId} 消息设置`,
        },
      });
    }

    return { success: true, settings: merged };
  }

  private defaultSettings() {
    return {
      channels: ["system"],
      dnd_enabled: false,
      dnd_start: "22:00",
      dnd_end: "08:00",
      dnd_allow_urgent: true,
    };
  }

  // ✅ 新增：检查是否在免打扰时间段内
  async isInDndPeriod(userId: string): Promise<boolean> {
    const settings = await this.getSettings(userId);
    if (!settings.dnd_enabled) return false;

    const now = new Date();
    const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`;
    const { dnd_start, dnd_end } = settings;

    // 跨天处理（如 22:00 - 08:00）
    if (dnd_start > dnd_end) {
      return currentTime >= dnd_start || currentTime <= dnd_end;
    }
    return currentTime >= dnd_start && currentTime <= dnd_end;
  }
}
