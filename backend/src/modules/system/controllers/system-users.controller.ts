import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
} from "@nestjs/common";
import { BatchUpdateUserStatusDto } from "../dto/batch-update-user-status.dto";
import { Permission } from "../../../common/permission.decorator";
import {
  CurrentUser,
  CurrentUserPayload,
} from "../../../common/current-user.decorator";
import { CreateUserDto } from "../dto/create-user.dto";
import { ResetUserPasswordDto } from "../dto/reset-user-password.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import { SystemUsersService } from "../services/system-users.service";

@Controller("system/users")
export class SystemUsersController {
  constructor(private readonly systemUsersService: SystemUsersService) {}

  @Get()
  @Permission("system:user:list")
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.systemUsersService.findAll(user);
  }

  @Post()
  @Permission("system:user:create")
  create(@Body() dto: CreateUserDto) {
    return this.systemUsersService.create(dto);
  }

  @Patch(":id")
  @Permission("system:user:update")
  update(@Param("id") id: string, @Body() dto: UpdateUserDto) {
    return this.systemUsersService.update(id, dto);
  }

  @Patch("profile")
  updateProfile(
    @CurrentUser() user: CurrentUserPayload,
    @Body() dto: UpdateUserDto,
  ) {
    return this.systemUsersService.update(user.sub, dto);
  }

  @Post("profile/password")
  updatePassword(@CurrentUser() user: CurrentUserPayload, @Body() data: any) {
    return this.systemUsersService.updatePassword(user.sub, data);
  }

  @Post(":id/reset-password")
  @Permission("system:user:reset-password")
  resetPassword(@Param("id") id: string, @Body() dto: ResetUserPasswordDto) {
    return this.systemUsersService.resetPassword(id, dto.password);
  }

  @Patch("batch/status")
  @Permission("system:user:batch-status")
  batchUpdateStatus(@Body() dto: BatchUpdateUserStatusDto) {
    return this.systemUsersService.batchUpdateStatus(dto.ids, dto.status);
  }

  @Post("batch/reset-password")
  @Permission("system:user:batch-reset-password")
  batchResetPassword(@Body() dto: { ids: string[]; password: string }) {
    return this.systemUsersService.batchResetPassword(dto.ids, dto.password);
  }

  @Post("batch/assign-roles")
  @Permission("system:user:batch-assign-roles")
  batchAssignRoles(@Body() dto: { ids: string[]; role_ids: string[] }) {
    return this.systemUsersService.batchAssignRoles(dto.ids, dto.role_ids);
  }

  @Delete(":id")
  @Permission("system:user:delete")
  remove(@Param("id") id: string) {
    return this.systemUsersService.remove(id);
  }
}
