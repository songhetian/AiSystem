import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { ExamService } from '../services/exam.service';

@Processor('exam-queue')
export class ExamWorker extends WorkerHost {
  constructor(private readonly examService: ExamService) {
    super();
  }

  async process(job: Job): Promise<any> {
    if (job.name === 'submit-exam') {
      const { assignmentId, answers, userId } = job.data;
      const result = await this.examService.performGrading(assignmentId, answers, userId);
      
      // 执行联动：成绩通知与补考设置
      await this.examService.triggerPostGradingHooks(assignmentId);
      return result;
    }
  }
}