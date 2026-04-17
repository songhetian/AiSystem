import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Logger, Injectable } from "@nestjs/common";
import { Job } from "bullmq";
import { PrismaService } from "../../../prisma/prisma.service";
import { VectorService } from "../../../common/services/vector.service";
import { MinioService } from "../../../common/services/minio.service";
import { DocumentParserService } from "../services/document-parser.service";
import * as fs from "fs/promises";
import * as path from "path";
import * as os from "os";

@Injectable()
@Processor("ai-analysis-queue")
export class KnowledgeWorker extends WorkerHost {
  private readonly logger = new Logger(KnowledgeWorker.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly vectorService: VectorService,
    private readonly minioService: MinioService,
    private readonly parserService: DocumentParserService,
  ) {
    super();
  }

  async process(job: Job): Promise<void> {
    switch (job.name) {
      case "process-document":
        await this.handleProcessDocument(job.data);
        break;
      case "upsert-article":
        await this.handleUpsertArticle(job.data);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleProcessDocument(data: { documentId: string }) {
    const { documentId } = data;
    const doc = await this.prisma.knowledge_document.findUnique({
      where: { id: documentId },
    });
    if (!doc) return;

    try {
      // 阶段1: 下载文件 (0-20%)
      await this.updateProgress(documentId, 0, "processing", "开始下载文件...");

      const tempDir = os.tmpdir();
      const tempPath = path.join(tempDir, `${doc.id}.${doc.file_type}`);

      await this.minioService.downloadObject(doc.file_path, tempPath);
      await this.updateProgress(
        documentId,
        20,
        "processing",
        "文件下载完成，开始解析文本...",
      );

      // 阶段2: 解析文本 (20-50%)
      const text = await this.parserService.parseFile(tempPath, doc.file_type);

      // Cleanup - 使用异步删除
      try {
        await fs.unlink(tempPath);
      } catch (error) {
        // File might not exist or already deleted, which is fine
        this.logger.warn(`Failed to cleanup temp file: ${tempPath}`, error);
      }

      if (!text || text.trim().length === 0) {
        throw new Error("解析出的文本为空");
      }

      await this.updateProgress(
        documentId,
        50,
        "processing",
        `文本解析成功 (${text.length} 字符)，开始切片...`,
      );

      // 阶段3: 文本切片 (50-70%)
      const chunks = this.chunkText(text, 500, 50);
      await this.updateProgress(
        documentId,
        70,
        "processing",
        `文本切片完成 (${chunks.length} 个片段)，开始向量化...`,
      );

      // 阶段4: 向量化 (70-100%)
      const vectorIds: string[] = [];
      const totalChunks = chunks.length;

      for (let i = 0; i < chunks.length; i++) {
        const pointId = `${doc.id}-p${i}`;
        await this.vectorService.upsertArticle({
          id: pointId,
          text: chunks[i],
          platform_id: doc.platform_id,
          dept_id: doc.dept_id,
          shop_id: doc.shop_id,
          metadata: {
            doc_id: doc.id,
            file_name: doc.file_name,
            chunk_index: i,
            is_public: doc.is_public,
            file_type: doc.file_type,
          },
        });
        vectorIds.push(pointId);

        // 更新向量化进度 (70-100%)
        const vectorProgress = 70 + Math.floor(((i + 1) / totalChunks) * 30);
        if (i % 5 === 0 || i === totalChunks - 1) {
          // 每5个片段更新一次进度
          await this.updateProgress(
            documentId,
            vectorProgress,
            "processing",
            `向量化进度: ${i + 1}/${totalChunks}`,
          );
        }
      }

      // 完成
      await this.prisma.knowledge_document.update({
        where: { id: documentId },
        data: {
          status: "completed",
          progress: 100,
          content: text,
          vector_ids: vectorIds,
          process_log: `✅ 处理完成！共生成 ${chunks.length} 个知识点，已导入向量数据库。`,
        },
      });
    } catch (error) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      const errorStack = error instanceof Error ? error.stack : undefined;
      this.logger.error(
        `Document processing failed: ${errorMessage}`,
        errorStack,
      );
      await this.prisma.knowledge_document.update({
        where: { id: documentId },
        data: {
          status: "failed",
          progress: 0,
          error_msg: errorMessage,
          process_log: `❌ 处理失败: ${errorMessage}`,
        },
      });
    }
  }

  /**
   * 更新文档处理进度
   */
  private async updateProgress(
    documentId: string,
    progress: number,
    status: string,
    log: string,
  ) {
    await this.prisma.knowledge_document.update({
      where: { id: documentId },
      data: { progress, status, process_log: log },
    });
  }

  private async handleUpsertArticle(data: { article: any }) {
    const { article } = data;
    await this.vectorService.upsertArticle({
      id: article.id,
      text: `${article.title}\n${article.content}`,
      platform_id: article.platform_id,
      dept_id: article.dept_id,
      shop_id: article.shop_id,
      metadata: {
        type: "article",
        title: article.title,
      },
    });
  }

  private chunkText(text: string, size: number, overlap: number): string[] {
    // 文本清洗：去除多余空白行、页码占位符等噪音
    const cleanedText = text
      .replace(/\r\n/g, "\n")
      .replace(/\n\s*\n/g, "\n") // 去除空行
      .replace(/第 \d+ 页/g, "") // 去除页码
      .trim();

    const chunks: string[] = [];
    let start = 0;
    while (start < cleanedText.length) {
      const end = Math.min(start + size, cleanedText.length);
      chunks.push(cleanedText.slice(start, end));
      if (end === cleanedText.length) break;
      start += size - overlap;
    }
    return chunks;
  }
}
