import { Injectable, NotFoundException } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";

@Injectable()
export class MessageRuleService {
  constructor(private readonly prisma: PrismaService) {}

  private get ruleDelegate() {
    return this.prisma["sys_message_rule" as keyof typeof this.prisma] as any;
  }

  async list() {
    return this.ruleDelegate.findMany({
      where: { is_deleted: 0 },
      orderBy: { sort: "asc" },
    });
  }

  async findByEvent(event: string) {
    return this.ruleDelegate.findMany({
      where: { event, enabled: true, is_deleted: 0 },
      orderBy: { priority: "asc" },
    });
  }

  async save(data: any) {
    if (data.id) {
      return this.ruleDelegate.update({
        where: { id: data.id },
        data: {
          ...data,
          update_time: new Date(),
        },
      });
    }
    return this.ruleDelegate.create({
      data: {
        ...data,
        is_deleted: 0,
      },
    });
  }

  async toggle(id: string, enabled: boolean) {
    return this.ruleDelegate.update({
      where: { id },
      data: { enabled },
    });
  }

  async delete(id: string) {
    return this.ruleDelegate.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }
}
