import { Injectable, Logger, NotFoundException } from "@nestjs/common";
import { ConfigService } from "@nestjs/config";
import { Observable, Subject } from "rxjs";
import { MinioService } from "../../../common/services/minio.service";
import { ScopeService } from "../../../common/services/scope.service";
import { VectorService } from "../../../common/services/vector.service";
import { RedisService } from "../../../common/services/redis.service";
import { AIConfigService } from "../../../common/services/ai-config.service";
import { PrismaService } from "../../../prisma/prisma.service";
import * as crypto from "crypto";

export interface ChatEvent {
  data: {
    content?: string;
    references?: any[];
    done?: boolean;
    error?: string;
  };
}

@Injectable()
export class KnowledgeChatService {
  private readonly logger = new Logger(KnowledgeChatService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly vectorService: VectorService,
    private readonly configService: ConfigService,
    private readonly minioService: MinioService,
    private readonly redisService: RedisService,
    private readonly aiConfigService: AIConfigService,
  ) {}

  /**
   * 生成向量检索缓存key
   */
  private generateSearchCacheKey(
    content: string,
    platformId: string,
    deptId: string,
  ): string {
    const hash = crypto.createHash("md5").update(content).digest("hex");
    return `kb:search:${hash}:${platformId}:${deptId}`;
  }

  /**
   * 带缓存的向量检索
   */
  private async searchWithCache(content: string, scope: any, limit: number) {
    const cacheKey = this.generateSearchCacheKey(
      content,
      scope.platform_id,
      scope.dept_id,
    );

    // 尝试从缓存获取
    const cached = await this.redisService.get(cacheKey);
    if (cached) {
      this.logger.debug(`向量检索缓存命中: ${cacheKey}`);
      return JSON.parse(cached);
    }

    // 缓存未命中，执行向量检索
    const searchResults = await this.vectorService.search(
      content,
      {
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
      },
      limit,
    );

    // 缓存结果（1小时）
    await this.redisService.set(cacheKey, JSON.stringify(searchResults), 3600);
    this.logger.debug(`向量检索结果已缓存: ${cacheKey}`);

    return searchResults;
  }

  async createSession(userId: string, title: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.prisma.knowledge_chat_session.create({
      data: {
        title,
        user_id: userId,
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
      },
    });
  }

  async listSessions(userId: string) {
    return this.prisma.knowledge_chat_session.findMany({
      where: { user_id: userId, is_deleted: 0 },
      orderBy: { update_time: "desc" },
    });
  }

  async getChatHistory(sessionId: string, limit = 50, offset = 0) {
    return this.prisma.knowledge_chat_message.findMany({
      where: { session_id: sessionId },
      orderBy: { create_time: "desc" },
      take: limit,
      skip: offset,
    });
  }

  async chatStream(
    userId: string,
    sessionId: string,
    content: string,
  ): Promise<Observable<ChatEvent>> {
    const scope = await this.scopeService.resolveAccess(userId);
    const session = await this.prisma.knowledge_chat_session.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.user_id !== userId)
      throw new NotFoundException("会话不存在");

    const eventSubject = new Subject<ChatEvent>();

    // 1. 保存用户消息
    await this.prisma.knowledge_chat_message.create({
      data: { session_id: sessionId, role: "user", content },
    });

    // 2. 向量检索（带缓存）
    const searchResults = await this.searchWithCache(content, scope, 5);

    // 发送引用详情给前端
    const references = await Promise.all(
      searchResults.map(async (r) => {
        const payload = (r.payload || {}) as any;
        const isImage = ["jpg", "jpeg", "png", "bmp", "gif"].includes(
          payload.file_type?.toLowerCase(),
        );
        let url = "";
        if (isImage && payload.file_path) {
          url = await this.minioService.getPresignedUrl(payload.file_path);
        }
        return {
          id: r.id,
          score: r.score,
          title: payload.file_name || payload.title || "未知来源",
          type: isImage ? "image" : payload.doc_id ? "document" : "article",
          text: (payload.text as string)?.substring(0, 100) + "...",
          url: url, // 图片预览链接
        };
      }),
    );
    eventSubject.next({ data: { references } });

    const contextText = searchResults
      .map((r) => (r.payload as any)?.text)
      .filter(Boolean)
      .join("\n---\n");

    // 3. 异步启动流式 LLM 调用
    this.streamLLM(content, contextText, eventSubject, sessionId);

    return eventSubject.asObservable();
  }

  private async streamLLM(
    question: string,
    context: string,
    subject: Subject<ChatEvent>,
    sessionId: string,
  ) {
    // 获取会话信息以确定部门
    const session = await this.prisma.knowledge_chat_session.findUnique({
      where: { id: sessionId },
    });

    // 获取部门级AI配置
    const aiConfig = await this.aiConfigService.getAIConfig(
      session?.platform_id,
      session?.dept_id,
    );

    let fullAnswer = "";

    try {
      const history = await this.prisma.knowledge_chat_message.findMany({
        where: { session_id: sessionId },
        orderBy: { create_time: "desc" },
        take: 11,
      });

      const messages = history.reverse().map((msg) => ({
        role: msg.role as "user" | "assistant",
        content: msg.content,
      }));

      const systemPrompt = `你是一个专业的企业知识库助手。请根据提供的资料回答问题。如果资料中没有内容则告知用户。

【参考资料】:
${context || "暂无参考资料"}`;

      const response = await fetch(`${aiConfig.apiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [{ role: "system", content: systemPrompt }, ...messages],
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens,
          stream: true,
        }),
      });

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();

      if (!reader) throw new Error("ReadableStream not supported");

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value);
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");

        for (const line of lines) {
          if (line.includes("[DONE]")) continue;
          if (line.startsWith("data: ")) {
            try {
              const data = JSON.parse(line.slice(6));
              const text = data.choices[0]?.delta?.content || "";
              if (text) {
                fullAnswer += text;
                subject.next({ data: { content: text } });
              }
            } catch (e) {
              this.logger.warn(
                `Failed to parse SSE data chunk: ${line.slice(0, 100)}`,
                e,
              );
            }
          }
        }
      }

      await this.prisma.knowledge_chat_message.create({
        data: { session_id: sessionId, role: "assistant", content: fullAnswer },
      });
      await this.prisma.knowledge_chat_session.update({
        where: { id: sessionId },
        data: { update_time: new Date() },
      });

      subject.next({ data: { done: true } });
      subject.complete();
    } catch (error) {
      this.logger.error("Stream LLM failed", error);
      subject.next({ data: { error: "对话生成失败" } });
      subject.complete();
    }
  }

  async chat(userId: string, sessionId: string, content: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    const session = await this.prisma.knowledge_chat_session.findUnique({
      where: { id: sessionId },
    });
    if (!session || session.user_id !== userId)
      throw new NotFoundException("会话不存在");

    await this.prisma.knowledge_chat_message.create({
      data: { session_id: sessionId, role: "user", content },
    });

    // 向量检索（带缓存）
    const searchResults = await this.searchWithCache(content, scope, 5);

    const contextText = searchResults
      .map((r) => (r.payload as any)?.text)
      .filter(Boolean)
      .join("\n---\n");
    const answer = await this.callLLM(content, contextText, scope.platform_id as string, scope.dept_id as string);

    const aiMsg = await this.prisma.knowledge_chat_message.create({
      data: {
        session_id: sessionId,
        role: "assistant",
        content: answer,
        references: searchResults.map((r) => r.id) as any,
      },
    });

    await this.prisma.knowledge_chat_session.update({
      where: { id: sessionId },
      data: { update_time: new Date() },
    });

    return aiMsg;
  }

  private async callLLM(question: string, context: string, platformId?: string, deptId?: string): Promise<string> {
    // 获取部门级AI配置
    const aiConfig = await this.aiConfigService.getAIConfig(platformId, deptId);

    if (!aiConfig.apiKey || !aiConfig.apiKey.startsWith("sk-")) {
      return `[系统提示] 未配置有效的 AI 密钥。检索到的相关知识如下：\n\n${context || "未找到相关知识"}`;
    }

    try {
      const prompt = `你是一个专业的企业知识库助手。请根据以下提供的【参考资料】回答用户的问题。如果资料中没有相关内容，请礼貌地告知用户。

【参考资料】:
${context || "暂无参考资料"}

【用户问题】:
${question}

请务必保持专业、简洁。`;

      const response = await fetch(`${aiConfig.apiBaseUrl}/chat/completions`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${aiConfig.apiKey}`,
        },
        body: JSON.stringify({
          model: aiConfig.model,
          messages: [
            { role: "system", content: "你是一个知识库助手" },
            { role: "user", content: prompt },
          ],
          temperature: aiConfig.temperature,
          max_tokens: aiConfig.maxTokens,
        }),
      });

      const json = await response.json();
      return json.choices[0].message.content;
    } catch (error) {
      this.logger.error("LLM Call failed", error);
      return "抱歉，AI 思考时遇到了点困难，请稍后再试。";
    }
  }
}
