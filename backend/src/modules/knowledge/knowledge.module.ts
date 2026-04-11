import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { KnowledgeController } from './controllers/knowledge.controller';
import { KnowledgeChatController } from './controllers/knowledge-chat.controller';
import { KnowledgeService } from './services/knowledge.service';
import { KnowledgeChatService } from './services/knowledge-chat.service';
import { DocumentParserService } from './services/document-parser.service';
import { KnowledgeWorker } from './workers/knowledge.worker';
import { BullModule } from '@nestjs/bullmq';

@Module({
  imports: [
    CommonModule,
    BullModule.registerQueue({ name: 'ai-analysis-queue' })
  ],
  controllers: [
    KnowledgeController,
    KnowledgeChatController
  ],
  providers: [
    KnowledgeService,
    KnowledgeChatService,
    DocumentParserService,
    KnowledgeWorker
  ],
  exports: [KnowledgeService]
})
export class KnowledgeModule {}
