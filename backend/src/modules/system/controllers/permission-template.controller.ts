import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Query,
  UseGuards,
  Delete,
} from "@nestjs/common";
import { ApiTags, ApiOperation, ApiBearerAuth } from "@nestjs/swagger";
import { JwtAuthGuard } from "../../../common/guards/jwt-auth.guard";
import { Permission } from "../../../common/permission.decorator";
import { CurrentUser } from "../../../common/current-user.decorator";
import { PermissionTemplateService } from "../services/permission-template.service";
import {
  CreatePermissionTemplateDto,
  UpdatePermissionTemplateDto,
  QueryPermissionTemplateDto,
  ApplyTemplateDto,
  ExportTemplateDto,
  ImportTemplateDto,
} from "../dto/permission-template.dto";

@ApiTags("系统管理 - 权限模板")
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller("system/permission-template")
export class PermissionTemplateController {
  constructor(private readonly templateService: PermissionTemplateService) {}

  @Get("list")
  @Permission("system:permission:view")
  @ApiOperation({ summary: "获取模板列表" })
  async getTemplateList(@Query() query: QueryPermissionTemplateDto) {
    return await this.templateService.getTemplateList(query);
  }

  @Get(":id")
  @Permission("system:permission:view")
  @ApiOperation({ summary: "获取模板详情" })
  async getTemplateById(@Param("id") id: string) {
    return await this.templateService.getTemplateById(id);
  }

  @Post("create")
  @Permission("system:permission:template:create")
  @ApiOperation({ summary: "创建模板" })
  async createTemplate(
    @Body() dto: CreatePermissionTemplateDto,
    @CurrentUser() user: any,
  ) {
    return await this.templateService.createTemplate(dto, user.sub);
  }

  @Post("update")
  @Permission("system:permission:template:update")
  @ApiOperation({ summary: "更新模板" })
  async updateTemplate(@Body() dto: UpdatePermissionTemplateDto) {
    return await this.templateService.updateTemplate(dto);
  }

  @Delete(":id")
  @Permission("system:permission:template:delete")
  @ApiOperation({ summary: "删除模板" })
  async deleteTemplate(@Param("id") id: string) {
    return await this.templateService.deleteTemplate(id);
  }

  @Post("apply")
  @Permission("system:permission:template:apply")
  @ApiOperation({ summary: "应用模板到角色" })
  async applyTemplate(@Body() dto: ApplyTemplateDto) {
    return await this.templateService.applyTemplate(dto);
  }

  @Post("export")
  @Permission("system:permission:template:export")
  @ApiOperation({ summary: "导出模板" })
  async exportTemplates(@Body() dto: ExportTemplateDto) {
    return await this.templateService.exportTemplates(dto);
  }

  @Post("import")
  @Permission("system:permission:template:import")
  @ApiOperation({ summary: "导入模板" })
  async importTemplates(
    @Body() dto: ImportTemplateDto,
    @CurrentUser() user: any,
  ) {
    return await this.templateService.importTemplates(dto, user.sub);
  }

  @Post("copy/:id")
  @Permission("system:permission:template:create")
  @ApiOperation({ summary: "复制模板" })
  async copyTemplate(
    @Param("id") id: string,
    @Body() body: { newName: string },
    @CurrentUser() user: any,
  ) {
    return await this.templateService.copyTemplate(id, body.newName, user.sub);
  }
}
