import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { randomBytes } from "crypto";

@Injectable()
export class DashboardManagerService {
  constructor(private readonly prisma: PrismaService) {}

  // --- 模板管理 ---

  async listTemplates(query: any) {
    return this.prisma.sys_dashboard_template.findMany({
      where: {
        is_deleted: 0,
        ...(query.type ? { type: query.type } : {}),
      },
      orderBy: { create_time: "desc" },
    });
  }

  async saveTemplate(data: any, userId: string) {
    if (data.id) {
      return this.prisma.sys_dashboard_template.update({
        where: { id: data.id },
        data: {
          ...data,
          update_time: new Date(),
        },
      });
    }
    return this.prisma.sys_dashboard_template.create({
      data: {
        ...data,
        created_by: userId,
        is_deleted: 0,
      },
    });
  }

  async deleteTemplate(id: string) {
    return this.prisma.sys_dashboard_template.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }

  // --- 分享管理 ---

  async createShare(templateId: string, userId: string, expireDays?: number) {
    const token = randomBytes(16).toString("hex");
    const expiresAt = expireDays
      ? new Date(Date.now() + expireDays * 24 * 60 * 60 * 1000)
      : null;

    return this.prisma.sys_dashboard_share.create({
      data: {
        template_id: templateId,
        share_token: token,
        expires_at: expiresAt,
        created_by: userId,
        status: 1,
      },
    });
  }

  async getShareInfo(token: string) {
    const share = await this.prisma.sys_dashboard_share.findUnique({
      where: { share_token: token, status: 1 },
    });

    if (!share) throw new NotFoundException("分享已失效或不存在");
    if (share.expires_at && share.expires_at < new Date()) {
      await this.prisma.sys_dashboard_share.update({
        where: { id: share.id },
        data: { status: 0 },
      });
      throw new NotFoundException("分享已过期");
    }

    return this.prisma.sys_dashboard_template.findUnique({
      where: { id: share.template_id },
    });
  }

  // --- 预警记录 ---

  async listAlerts(platformId?: string) {
    return this.prisma.sys_dashboard_alert_record.findMany({
      where: {
        is_deleted: 0,
        ...(platformId ? { platform_id: platformId } : {}),
      },
      orderBy: { create_time: "desc" },
      take: 100,
    });
  }

  async handleAlert(id: string, userId: string, note: string) {
    return this.prisma.sys_dashboard_alert_record.update({
      where: { id },
      data: {
        status: "handled",
        handle_user_id: userId,
        handle_note: note,
        handle_time: new Date(),
      },
    });
  }
}
