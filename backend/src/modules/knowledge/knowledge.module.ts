import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { KnowledgeController } from './controllers/knowledge.controller';
import { KnowledgeService } from './services/knowledge.service';

@Module({
  imports: [CommonModule],
  controllers: [KnowledgeController],
  providers: [KnowledgeService]
})
export class KnowledgeModule {}
