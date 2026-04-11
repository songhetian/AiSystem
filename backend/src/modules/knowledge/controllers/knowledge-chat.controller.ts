import { Controller, Get, Post, Body, Param, UseGuards, Sse, MessageEvent, Query } from '@nestjs/common';
import { JwtAuthGuard } from '../../../common/guards/jwt-auth.guard';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { KnowledgeChatService } from '../services/knowledge-chat.service';
import { map } from 'rxjs/operators';

@Controller('knowledge/chat')
@UseGuards(JwtAuthGuard)
export class KnowledgeChatController {
  constructor(private readonly chatService: KnowledgeChatService) {}

  @Sse('sessions/:id/chat-stream')
  async chatSse(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Query('content') content: string
  ) {
    const obs = await this.chatService.chatStream(user.sub, id, content);
    return obs.pipe(
      map((event) => ({
        data: event.data,
      } as MessageEvent))
    );
  }

  @Post('sessions')
  createSession(@CurrentUser() user: CurrentUserPayload, @Body() body: { title: string }) {
    return this.chatService.createSession(user.sub, body.title || '新对话');
  }

  @Get('sessions')
  listSessions(@CurrentUser() user: CurrentUserPayload) {
    return this.chatService.listSessions(user.sub);
  }

  @Get('sessions/:id/messages')
  getMessages(@Param('id') id: string) {
    return this.chatService.getChatHistory(id);
  }
}
