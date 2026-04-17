import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { CommonModule } from "../../common/common.module";
import { ApprovalModule } from "../approval/approval.module";
import { AttendanceSchedulesController } from "./controllers/attendance-schedules.controller";
import { AttendanceWorkflowsController } from "./controllers/attendance-workflows.controller";
import { ShiftsController } from "./controllers/shifts.controller";
import { AttendanceRecordsController } from "./controllers/attendance-records.controller";
import { AttendanceSchedulesService } from "./services/attendance-schedules.service";
import { AttendanceWorkflowsService } from "./services/attendance-workflows.service";
import { ShiftsService } from "./services/shifts.service";
import { AttendanceRecordsService } from "./services/attendance-records.service";
import { CoverageController } from "./controllers/coverage.controller";
import { CoverageService } from "./services/coverage.service";
import { AiScheduleController } from "./controllers/ai-schedule.controller";
import { AiScheduleService } from "./services/ai-schedule.service";
import { ScheduleAlgorithmService } from "./services/schedule-algorithm.service";
import { SchedulePredictionService } from "./services/schedule-prediction.service";
import { SettingsController } from "./controllers/settings.controller";
import { SettingsService } from "./services/settings.service";
import { AttendanceWorker } from "./workers/attendance.worker";
import { EmployeeScheduleController } from "./controllers/employee-schedule.controller";
import { EmployeeScheduleService } from "./services/employee-schedule.service";
import { ShiftCacheService } from "./services/shift-cache.service";
// V4.0 新增服务
import { ScheduleAsyncService } from "./services/schedule-async.service";
import { ScheduleAsyncWorker } from "./workers/schedule-async.worker";
import { ScheduleIncrementalService } from "./services/schedule-incremental.service";
import { ScheduleRecommendationService } from "./services/schedule-recommendation.service";
import { ScheduleMlService } from "./services/schedule-ml.service";
import { ScheduleMultiObjectiveService } from "./services/schedule-multi-objective.service";
import { ScheduleRealtimeService } from "./services/schedule-realtime.service";

@Module({
  imports: [
    CommonModule,
    ApprovalModule,
    BullModule.registerQueue({
      name: "attendance-queue",
    }),
    BullModule.registerQueue({
      name: "schedule-queue", // V4.0 新增队列
    }),
  ],
  controllers: [
    AttendanceSchedulesController,
    AttendanceWorkflowsController,
    ShiftsController,
    AttendanceRecordsController,
    CoverageController,
    AiScheduleController,
    SettingsController,
    EmployeeScheduleController,
  ],
  providers: [
    AttendanceSchedulesService,
    AttendanceWorkflowsService,
    ShiftsService,
    AttendanceRecordsService,
    CoverageService,
    AiScheduleService,
    ScheduleAlgorithmService,
    SchedulePredictionService,
    SettingsService,
    AttendanceWorker,
    EmployeeScheduleService,
    ShiftCacheService, // 班次缓存服务
    // V4.0 新增服务
    ScheduleAsyncService,
    ScheduleAsyncWorker,
    ScheduleIncrementalService,
    ScheduleRecommendationService,
    ScheduleMlService,
    ScheduleMultiObjectiveService,
    ScheduleRealtimeService,
  ],
})
export class AttendanceModule {}
