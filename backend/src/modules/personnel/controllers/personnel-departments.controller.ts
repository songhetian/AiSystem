import { Controller, Get } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { Permission } from '../../../common/permission.decorator';
import { ScopeService } from '../../../common/services/scope.service';
import { PrismaService } from '../../../prisma/prisma.service';

@Controller('personnel/departments')
export class PersonnelDepartmentsController {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService
  ) {}

  @Get()
  @Permission('personnel:department:list')
  async findAll(@CurrentUser() user: CurrentUserPayload) {
    const scope = await this.scopeService.resolveAccess(user.sub);

    return this.prisma.biz_department.findMany({
      where: this.scopeService.applyScope(scope, { is_deleted: 0 }, { platform: 'platform_id' }),
      orderBy: [{ sort: 'asc' }, { create_time: 'desc' }]
    });
  }
}
