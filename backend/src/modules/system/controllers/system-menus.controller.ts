import { Body, Controller, Delete, Get, Param, Patch, Post, Query } from '@nestjs/common';
import { Permission } from '../../../common/permission.decorator';
import { CreateMenuDto } from '../dto/create-menu.dto';
import { MenuTreeQueryDto } from '../dto/menu-tree-query.dto';
import { SortMenuDto } from '../dto/sort-menu.dto';
import { UpdateMenuDto } from '../dto/update-menu.dto';
import { SystemMenusService } from '../services/system-menus.service';

@Controller('system/menus')
export class SystemMenusController {
  constructor(private readonly systemMenusService: SystemMenusService) {}

  @Get()
  @Permission('system:menu:list')
  findAll() {
    return this.systemMenusService.findAll();
  }

  @Get('tree')
  @Permission('system:menu:list')
  findTree(@Query() query: MenuTreeQueryDto) {
    return this.systemMenusService.findTree(query.role_id);
  }

  @Post()
  @Permission('system:menu:create')
  create(@Body() dto: CreateMenuDto) {
    return this.systemMenusService.create(dto);
  }

  @Patch(':id')
  @Permission('system:menu:update')
  update(@Param('id') id: string, @Body() dto: UpdateMenuDto) {
    return this.systemMenusService.update(id, dto);
  }

  @Post('sort')
  @Permission('system:menu:sort')
  sort(@Body() dto: SortMenuDto) {
    return this.systemMenusService.sort(dto.items);
  }

  @Delete(':id')
  @Permission('system:menu:delete')
  remove(@Param('id') id: string) {
    return this.systemMenusService.remove(id);
  }
}
