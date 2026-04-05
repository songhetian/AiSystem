import { Body, Controller, Delete, Get, Param, Patch, Post } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { CreatePositionDto } from '../dto/create-position.dto';
import { UpdatePositionDto } from '../dto/update-position.dto';
import { PersonnelPositionsService } from '../services/personnel-positions.service';

@Controller('personnel/positions')
export class PersonnelPositionsController {
  constructor(private readonly personnelPositionsService: PersonnelPositionsService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.personnelPositionsService.findAll(user.sub);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreatePositionDto) {
    return this.personnelPositionsService.create(user.sub, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdatePositionDto) {
    return this.personnelPositionsService.update(user.sub, id, dto);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.personnelPositionsService.remove(user.sub, id);
  }
}
