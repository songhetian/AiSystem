import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ApprovalService } from '../services/approval.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Processor('approval-queue')
export class ApprovalWorker extends WorkerHost {
  constructor(
    private readonly prisma: PrismaService,
    private readonly approvalService: ApprovalService
  ) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name === 'biz-callback') {
      const { requestId, action, operatorId } = job.data;
      const request = await (this.prisma as any).approval_request.findUnique({ where: { id: requestId } });
      if (!request) return;
      
      return await this.approvalService.runBizSync(request, action, operatorId);
    }
  }
}