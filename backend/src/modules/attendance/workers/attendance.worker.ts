import { Processor, WorkerHost } from '@nestjs/bullmq';
import { Job } from 'bullmq';
import { AttendanceRecordsService } from '../services/attendance-records.service';

@Processor('attendance-queue')
export class AttendanceWorker extends WorkerHost {
  constructor(private readonly recordsService: AttendanceRecordsService) {
    super();
  }

  async process(job: Job<any, any, string>): Promise<any> {
    if (job.name === 'recalculate') {
      return this.recordsService.reCalculate(job.data.recordId);
    }
  }
}