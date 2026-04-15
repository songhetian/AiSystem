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
} from "@nestjs/common";
import { JwtAuthGuard } from "../../auth/guards/jwt-auth.guard";
import { CurrentUser } from "../../../common/decorators/current-user.decorator";
import { CurrentUserPayload } from "../../../common/interfaces/current-user.interface";
import { QuerySystemMessagesDto } from "../dto/query-system-messages.dto";
import { SystemMessagesService } from "../services/system-messages.service";

/**
 * 通知管理控制器 (工业级版本)
 * 对标 PRD 2.1 - 2.5
 */
@Controller("system/messages")
@UseGuards(JwtAuthGuard)
export class SystemMessagesController {
  constructor(private readonly systemMessagesService: SystemMessagesService) {}

  // --- 个人消息操作 (Inbox/Favorite/Trash) ---

  @Get()
  list(
    @CurrentUser() user: CurrentUserPayload,
    @Query() query: QuerySystemMessagesDto,
  ) {
    return this.systemMessagesService.list(user.id, query);
  }

  @Get("stats")
  stats(@CurrentUser() user: CurrentUserPayload) {
    return this.systemMessagesService.stats(user.id);
  }

  @Patch(":id/read")
  markRead(@CurrentUser() user: CurrentUserPayload, @Param("id") id: string) {
    return this.systemMessagesService.markRead(user.id, id);
  }

  @Patch(":id/favorite")
  toggleFavorite(
    @CurrentUser() user: CurrentUserPayload,
    @Param("id") id: string,
  ) {
    return this.systemMessagesService.toggleFavorite(user.id, id);
  }

  @Post("trash")
  moveToTrash(
    @CurrentUser() user: CurrentUserPayload,
    @Body("ids") ids: string[],
  ) {
    return this.systemMessagesService.moveToTrash(user.id, ids);
  }

  @Post("restore")
  restoreFromTrash(
    @CurrentUser() user: CurrentUserPayload,
    @Body("ids") ids: string[],
  ) {
    return this.systemMessagesService.restoreFromTrash(user.id, ids);
  }

  @Patch("read-all")
  markAllRead(@CurrentUser() user: CurrentUserPayload) {
    return this.systemMessagesService.markAllRead(user.id);
  }

  @Delete("trash")
  purgeTrash(@CurrentUser() user: CurrentUserPayload) {
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
    return this.systemMessagesService.sendFromTemplate({
      templateName: data.templateName,
      recipientId: user.id, // 测试发给自己
      variables: data.variables || {},
      senderId: user.id,
    });
  }

  // ✅ 新增：消息设置（PRD 2.3.3）
  @Get("settings")
  getSettings(@CurrentUser() user: CurrentUserPayload) {
    return this.systemMessagesService.getSettings(user.id);
  }

  @Post("settings")
  saveSettings(@CurrentUser() user: CurrentUserPayload, @Body() body: any) {
    return this.systemMessagesService.saveSettings(user.id, body);
  }
}
