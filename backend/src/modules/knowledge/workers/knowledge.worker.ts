import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Logger, Injectable } from '@nestjs/common';
import { Job } from 'bullmq';
import { PrismaService } from '../../../prisma/prisma.service';
import { VectorService } from '../../../common/services/vector.service';
import { MinioService } from '../../../common/services/minio.service';
import { DocumentParserService } from '../services/document-parser.service';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';

@Injectable()
@Processor('ai-analysis-queue')
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
      case 'process-document':
        await this.handleProcessDocument(job.data);
        break;
      case 'upsert-article':
        await this.handleUpsertArticle(job.data);
        break;
      default:
        this.logger.warn(`Unknown job name: ${job.name}`);
    }
  }

  private async handleProcessDocument(data: { documentId: string }) {
    const { documentId } = data;
    const doc = await this.prisma.knowledge_document.findUnique({ where: { id: documentId } });
    if (!doc) return;

    try {
      await this.prisma.knowledge_document.update({
        where: { id: documentId },
        data: { status: 'processing', process_log: '开始下载文件...' },
      });

      const tempDir = os.tmpdir();
      const tempPath = path.join(tempDir, `${doc.id}.${doc.file_type}`);

      await this.minioService.downloadObject(doc.file_path, tempPath);

      await this.prisma.knowledge_document.update({
        where: { id: documentId },
        data: { process_log: '文件下载完成，开始解析文本...' },
      });
      const text = await this.parserService.parseFile(tempPath, doc.file_type);

      // Cleanup
      if (fs.existsSync(tempPath)) fs.unlinkSync(tempPath);

      if (!text || text.trim().length === 0) {
        throw new Error('解析出的文本为空');
      }

      await this.prisma.knowledge_document.update({
        where: { id: documentId },
        data: { process_log: `文本解析成功 (${text.length} 字符)，开始切片并向量化...` },
      });

      // 切片逻辑：简单按 500 字切片，重叠 50 字
      const chunks = this.chunkText(text, 500, 50);
      const vectorIds: string[] = [];

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
            is_public: doc.is_public, // 新增：记录公共状态
          },
        });
        vectorIds.push(pointId);
      }

      await this.prisma.knowledge_document.update({
        where: { id: documentId },
        data: {
          status: 'completed',
          content: text, // 保存全文
          vector_ids: vectorIds,
          process_log: `处理完成，共生成 ${chunks.length} 个知识点。`,
        },
      });
    } catch (error: any) {
      this.logger.error(`Document processing failed: ${error?.message || 'Unknown error'}`, error?.stack);
      await this.prisma.knowledge_document.update({
        where: { id: documentId },
        data: {
          status: 'failed',
          error_msg: error?.message || 'Unknown error',
          process_log: `处理失败: ${error?.message || 'Unknown error'}`,
        },
      });
    }
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
        type: 'article',
        title: article.title,
      },
    });
  }

  private chunkText(text: string, size: number, overlap: number): string[] {
    // 文本清洗：去除多余空白行、页码占位符等噪音
    const cleanedText = text
      .replace(/\r\n/g, '\n')
      .replace(/\n\s*\n/g, '\n') // 去除空行
      .replace(/第 \d+ 页/g, '') // 去除页码
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
