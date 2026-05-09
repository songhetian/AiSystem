import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  BadRequestException,
} from "@nestjs/common";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { CurrentUser, CurrentUserPayload } from "../../../common/current-user.decorator";
import { QuerySystemMessagesDto } from "../dto/query-system-messages.dto";
import { SystemMessagesService } from "../services/system-messages.service";
import { MessageRuleService } from "../services/message-rule.service";

/**
 * 通知管理控制器 (工业级版本)
 * 对标 PRD 2.1 - 2.5
 */
@Controller("system/messages")
@UseGuards(JwtAuthGuard)
export class SystemMessagesController {
  constructor(
    private readonly systemMessagesService: SystemMessagesService,
    private readonly messageRuleService: MessageRuleService,
  ) {}

  // --- 个人消息操作 (Inbox/Favorite/Trash) ---

  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QuerySystemMessagesDto,
  ) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.systemMessagesService.list(user.id, query);
  }

  @Get("stats")
  stats(@CurrentUser() user: CurrentUserPayload) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.systemMessagesService.stats(user.id);
  }

  @Patch(":id/read")
  markRead(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.systemMessagesService.markRead(user.id, id);
  }

  @Patch(":id/favorite")
  toggleFavorite(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.systemMessagesService.toggleFavorite(user.id, id);
  }

  @Post("trash")
  moveToTrash(
    @CurrentUser() user: CurrentUserPayload,
    @Body("ids") ids: string[],
  ) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.systemMessagesService.moveToTrash(user.id, ids);
  }

  @Post("restore")
  restoreFromTrash(
    @CurrentUser() user: CurrentUserPayload,
    @Body("ids") ids: string[],
  ) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.systemMessagesService.restoreFromTrash(user.id, ids);
  }

  @Patch("read-all")
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.systemMessagesService.markAllRead(user.id);
  }

  @Delete("trash")
  purgeTrash(@CurrentUser() user: CurrentUserPayload) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.systemMessagesService.purgeTrash(user.id);
  }

  // --- 消息模板管理 (Admin Only) ---

  @Get("templates")
  listTemplates(@Query() query: any) {
    return this.systemMessagesService.listTemplates(query);
  }

  @Post("templates")
  saveTemplate(@Body() data: any) {
    return this.systemMessagesService.saveTemplate(data);
  }

  @Post("send-test")
  sendTest(@CurrentUser() user: CurrentUserPayload, @Body() data: any) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.systemMessagesService.sendFromTemplate({
      templateName: data.templateName,
      recipientId: user.id, // 测试发给自己
      variables: data.variables || {},
      senderId: user.id,
    });
  }

  // ✅ 新增：手动发送消息 (PRD 2.2.2)
  @Post("send-manual")
  sendManual(@CurrentUser() user: CurrentUserPayload, @Body() data: any) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    // data: { templateId, recipientIds: [], customContent?, variables: {} }
    return this.systemMessagesService.sendManual(data, user.id);
  }

  // ✅ 新增：消息联动规则（PRD 2.5）
  @Get("linkage-rules")
  listLinkageRules() {
    return this.messageRuleService.list();
  }

  @Post("linkage-rules")
  saveLinkageRule(@Body() data: any) {
    return this.messageRuleService.save(data);
  }

  @Patch("linkage-rules/:id/toggle")
  toggleLinkageRule(@Param("id") id: string, @Body("enabled") enabled: boolean) {
    return this.messageRuleService.toggle(id, enabled);
  }

  @Delete("linkage-rules/:id")
  deleteLinkageRule(@Param("id") id: string) {
    return this.messageRuleService.delete(id);
  }

  // --- 发送记录 (PRD 2.2.3) ---
  @Get("logs")
  listLogs(@Query() query: any) {
    return this.systemMessagesService.listLogs(query);
  }

  // ✅ 新增：消息设置（PRD 2.3.3）
  @Get("settings")
  getSettings(@CurrentUser() user: CurrentUserPayload) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.systemMessagesService.getSettings(user.id);
  }

  @Post("settings")
  saveSettings(@CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    if (!user.id) {
      throw new BadRequestException('用户ID不能为空');
    }
    return this.systemMessagesService.saveSettings(user.id, body);
  }
}

