import { Injectable, Logger } from "@nestjs/common";
import { OnEvent } from "@nestjs/event-emitter";
import { PrismaService } from "../../../prisma/prisma.service";
import { SystemMessagesService } from "./system-messages.service";
import { MessageRuleService } from "./message-rule.service";

@Injectable()
export class MessageAutomationService {
  private readonly logger = new Logger(MessageAutomationService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly systemMessagesService: SystemMessagesService,
    private readonly messageRuleService: MessageRuleService,
  ) {}

  @OnEvent("message.trigger")
  async handleTrigger(payload: {
    event: string;
    variables: Record<string, any>;
    platformId?: string;
    deptId?: string;
    shopId?: string;
    userIds?: string[]; // 直接指定的接收人
    bizId?: string;
    bizType?: string;
  }) {
    this.logger.log(`Handling message trigger: ${payload.event}`);

    // 1. 获取匹配的联动规则
    const rules = await this.messageRuleService.findByEvent(payload.event);
    if (!rules.length) {
      this.logger.debug(`No active rules found for event: ${payload.event}`);
      return;
    }

    // 2. 逐一执行规则
    for (const rule of rules) {
      try {
        // 3. 解析接收人
        const recipientIds = await this.resolveRecipients(rule, payload);
        if (!recipientIds.length) continue;

        // 4. 发送通知
        const template = await this.prisma.sys_message_template.findUnique({
          where: { id: rule.template_id },
        });

        if (!template) {
          this.logger.warn(`Template ${rule.template_id} not found for rule ${rule.id}`);
          continue;
        }

        await this.systemMessagesService.sendManual(
          {
            templateId: template.id,
            recipientIds,
            variables: payload.variables,
          },
          "system", // 系统自动发送
        );

        this.logger.log(`Triggered notification for rule ${rule.name || rule.id} to ${recipientIds.length} users`);
      } catch (error: any) {
        this.logger.error(`Failed to process rule ${rule.id}`, error.stack);
      }
    }
  }

  private async resolveRecipients(rule: any, payload: any): Promise<string[]> {
    const recipientIds = new Set<string>();
    const rules = rule.recipient_rules as string[];

    if (payload.userIds) {
      payload.userIds.forEach((id: string) => recipientIds.add(id));
    }

    for (const r of rules) {
      switch (r) {
        case "applicant":
          if (payload.variables.applicant_id) recipientIds.add(payload.variables.applicant_id);
          else if (payload.variables.user_id) recipientIds.add(payload.variables.user_id);
          break;

        case "approver":
          if (payload.variables.approver_id) recipientIds.add(payload.variables.approver_id);
          break;

        case "dept_admin":
          if (payload.deptId) {
            const admins = await this.prisma.sys_user.findMany({
              where: {
                dept_id: payload.deptId,
                roles: { some: { role: { role_code: "dept_admin" } } },
                is_deleted: 0,
              },
              select: { id: true },
            });
            admins.forEach((u) => recipientIds.add(u.id));
          }
          break;

        case "platform_admin":
          if (payload.platformId) {
            const admins = await this.prisma.sys_user.findMany({
              where: {
                platform_id: payload.platformId,
                roles: { some: { role: { role_code: "platform_admin" } } },
                is_deleted: 0,
              },
              select: { id: true },
            });
            admins.forEach((u) => recipientIds.add(u.id));
          }
          break;

        case "role":
          // 如果规则中指定了角色（目前 schema 可能需要扩展或使用 remark/payload）
          // 暂时跳过或从 payload 中提取
          break;
      }
    }

    return Array.from(recipientIds);
  }
}
