import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ScopeService } from "../../../common/services/scope.service";
import { UpdateAiConfigDto } from "../dto/settings.dto";

@Injectable()
export class SettingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  private get aiConfigDelegate() {
    return this.prisma[
      "attendance_ai_config" as keyof typeof this.prisma
    ] as any;
  }

  async getConfig(userId: string) {
    const scope = await this.scopeService.resolveAccess(userId);
    let config = await this.aiConfigDelegate().findUnique({
      where: {
        attendance_ai_config_unique_key: {
          platform_id: scope.platform_id as string,
          dept_id: scope.dept_id as string,
        },
      },
    });

    if (!config) {
      config = await this.aiConfigDelegate().create({
        data: {
          platform_id: scope.platform_id as string,
          dept_id: scope.dept_id as string,
          ui_settings: {
            default_color: "#3b82f6",
            default_opacity: 50,
            show_conflict_warning: true,
          },
        },
      });
    }

    return config;
  }

  async updateConfig(userId: string, dto: UpdateAiConfigDto) {
    const scope = await this.scopeService.resolveAccess(userId);
    return this.aiConfigDelegate().upsert({
      where: {
        attendance_ai_config_unique_key: {
          platform_id: scope.platform_id as string,
          dept_id: scope.dept_id as string,
        },
      },
      update: dto,
      create: {
        ...dto,
        platform_id: scope.platform_id as string,
        dept_id: scope.dept_id as string,
      },
    });
  }
}
