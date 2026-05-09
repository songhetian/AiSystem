import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module";
import { SystemApiKeysController } from "./controllers/system-api-keys.controller";
import { SystemApisController } from "./controllers/system-apis.controller";
import { SystemButtonsController } from "./controllers/system-buttons.controller";
import { SystemDepartmentsController } from "./controllers/system-departments.controller";
import { SystemIntegrationsController } from "./controllers/system-integrations.controller";
import { SystemLogsController } from "./controllers/system-logs.controller";
import { SystemMessagesController } from "./controllers/system-messages.controller";
import { SystemMenusController } from "./controllers/system-menus.controller";
import { SystemPermissionsController } from "./controllers/system-permissions.controller";
import { SystemPlatformsController } from "./controllers/system-platforms.controller";
import { SystemRolesController } from "./controllers/system-roles.controller";
import { SystemShopsController } from "./controllers/system-shops.controller";
import { SystemUsersController } from "./controllers/system-users.controller";
import { FileController } from "./controllers/file.controller";
import { ExternalApiKeyService } from "./services/external-api-key.service";
import { SystemApisService } from "./services/system-apis.service";
import { SystemButtonsService } from "./services/system-buttons.service";
import { SystemDepartmentsService } from "./services/system-departments.service";
import { SystemIntegrationService } from "./services/system-integration.service";
import { SystemLogsService } from "./services/system-logs.service";
import { SystemMessagesService } from "./services/system-messages.service";
import { SystemMenusService } from "./services/system-menus.service";
import { SystemPermissionsService } from "./services/system-permissions.service";
import { SystemPlatformsService } from "./services/system-platforms.service";
import { SystemRolesService } from "./services/system-roles.service";
import { SystemShopsService } from "./services/system-shops.service";
import { SystemUsersService } from "./services/system-users.service";
import { ApiMonitorService } from "./services/api-monitor.service";
import { MappingService } from "./services/mapping.service";
import { SystemCronWorker } from "./workers/cron.worker";
import { SystemMappingController } from "./controllers/system-mapping.controller";

import { IntegrationMonitorService } from "./services/integration-monitor.service";
import { DashboardController } from "./controllers/dashboard.controller";
import { DashboardService } from "./services/dashboard.service";
import { ArchiveService } from "./services/archive.service";
import { PlatformIntegrationAdapterService } from "./services/platform-integration-adapter.service";
import { SystemPermissionControlService } from "./services/system-permission-control.service";
import { SystemPermissionControlController } from "./controllers/system-permission-control.controller";
import { PermissionTemplateController } from "./controllers/permission-template.controller";
import { PermissionTemplateService } from "./services/permission-template.service";
import { PermissionCleanupService } from "./services/permission-cleanup.service";
import { PermissionCleanupController } from "./controllers/permission-cleanup.controller";
import { AIConfigController } from "./controllers/ai-config.controller";
import { IdConverterService } from "./services/id-converter.service";
import { LoginLogService } from "./services/login-log.service";
import { PartitionService } from "./services/partition.service";
import { LogCacheService } from "./services/log-cache.service";
import { LogAlertService } from "./services/log-alert.service";
import { LogBackupService } from "./services/log-backup.service";
import { MessageRuleService } from "./services/message-rule.service";
import { MessageAutomationService } from "./services/message-automation.service";

@Module({
  imports: [CommonModule],
  controllers: [
    SystemUsersController,
    SystemRolesController,
    SystemMenusController,
    SystemLogsController,
    SystemMessagesController,
    SystemApiKeysController,
    SystemApisController,
    SystemButtonsController,
    SystemPermissionsController,
    SystemPlatformsController,
    SystemDepartmentsController,
    SystemShopsController,
    SystemIntegrationsController,
    SystemMappingController,
    DashboardController,
    SystemPermissionControlController,
    PermissionTemplateController,
    PermissionCleanupController,
    FileController,
    AIConfigController,
  ],
  providers: [
    SystemUsersService,
    SystemRolesService,
    SystemMenusService,
    SystemLogsService,
    SystemMessagesService,
    MessageRuleService,
    MessageAutomationService,
    ExternalApiKeyService,
    SystemApisService,
    SystemButtonsService,
    SystemPermissionsService,
    SystemPlatformsService,
    SystemDepartmentsService,
    SystemShopsService,
    SystemIntegrationService,
    ApiMonitorService,
    MappingService,
    IntegrationMonitorService,
    PlatformIntegrationAdapterService,
    SystemCronWorker,
    DashboardService,
    ArchiveService,
    SystemPermissionControlService,
    PermissionTemplateService,
    PermissionCleanupService,
    IdConverterService,
    LoginLogService,
    PartitionService,
    LogCacheService,
    LogAlertService,
    LogBackupService,
  ],
  exports: [
    SystemMessagesService,
    MessageRuleService,
    MessageAutomationService,
    DashboardService,
    ArchiveService,
    IdConverterService,
    LoginLogService,
    PartitionService,
    LogCacheService,
    LogAlertService,
    LogBackupService,
  ],
})
export class SystemModule {}
