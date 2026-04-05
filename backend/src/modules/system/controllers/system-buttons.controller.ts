import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { Permission } from '../../../common/permission.decorator';
import { CreateButtonDto } from '../dto/create-button.dto';
import { UpdateButtonDto } from '../dto/update-button.dto';
import { SystemButtonsService } from '../services/system-buttons.service';

@Controller('system/buttons')
export class SystemButtonsController {
  constructor(private readonly systemButtonsService: SystemButtonsService) {}

  @Get()
  @Permission('system:button:list')
  findAll() {
    return this.systemButtonsService.findAll();
  }

  @Post()
  @Permission('system:button:create')
  create(@Body() dto: CreateButtonDto) {
    return this.systemButtonsService.create(dto);
  }

  @Patch(':id')
  @Permission('system:button:update')
  update(@Param('id') id: string, @Body() dto: UpdateButtonDto) {
    return this.systemButtonsService.update(id, dto);
  }

  @Delete(':id')
  @Permission('system:button:delete')
  remove(@Param('id') id: string) {
    return this.systemButtonsService.remove(id);
  }
}
