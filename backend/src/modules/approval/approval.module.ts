import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { ApprovalController } from './controllers/approval.controller';
import { ApprovalService } from './services/approval.service';

@Module({
  imports: [CommonModule],
  controllers: [ApprovalController],
  providers: [ApprovalService],
  exports: [ApprovalService]
})
export class ApprovalModule {}
