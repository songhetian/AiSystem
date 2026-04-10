import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { SystemApiKeysController } from './controllers/system-api-keys.controller';
import { SystemApisController } from './controllers/system-apis.controller';
import { SystemButtonsController } from './controllers/system-buttons.controller';
import { SystemDepartmentsController } from './controllers/system-departments.controller';
import { SystemIntegrationsController } from './controllers/system-integrations.controller';
import { SystemLogsController } from './controllers/system-logs.controller';
import { SystemMessagesController } from './controllers/system-messages.controller';
import { SystemMenusController } from './controllers/system-menus.controller';
import { SystemPermissionsController } from './controllers/system-permissions.controller';
import { SystemPlatformsController } from './controllers/system-platforms.controller';
import { SystemRolesController } from './controllers/system-roles.controller';
import { SystemShopsController } from './controllers/system-shops.controller';
import { SystemUsersController } from './controllers/system-users.controller';
import { ExternalApiKeyService } from './services/external-api-key.service';
import { SystemApisService } from './services/system-apis.service';
import { SystemButtonsService } from './services/system-buttons.service';
import { SystemDepartmentsService } from './services/system-departments.service';
import { SystemIntegrationService } from './services/system-integration.service';
import { SystemLogsService } from './services/system-logs.service';
import { SystemMessagesService } from './services/system-messages.service';
import { SystemMenusService } from './services/system-menus.service';
import { SystemPermissionsService } from './services/system-permissions.service';
import { SystemPlatformsService } from './services/system-platforms.service';
import { SystemRolesService } from './services/system-roles.service';
import { SystemShopsService } from './services/system-shops.service';
import { SystemUsersService } from './services/system-users.service';
import { ApiMonitorService } from './services/api-monitor.service';

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
    SystemIntegrationsController
  ],
  providers: [
    SystemUsersService,
    SystemRolesService,
    SystemMenusService,
    SystemLogsService,
    SystemMessagesService,
    ExternalApiKeyService,
    SystemApisService,
    SystemButtonsService,
    SystemPermissionsService,
    SystemPlatformsService,
    SystemDepartmentsService,
    SystemShopsService,
    SystemIntegrationService,
    ApiMonitorService
  ]
})
export class SystemModule {}
