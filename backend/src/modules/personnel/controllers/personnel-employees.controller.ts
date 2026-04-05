import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { PersonnelEmployeesService } from '../services/personnel-employees.service';

@Controller('personnel/employees')
export class PersonnelEmployeesController {
  constructor(private readonly personnelEmployeesService: PersonnelEmployeesService) {}

  @Get()
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.personnelEmployeesService.findAll(user.sub);
  }

  @Post()
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateEmployeeDto) {
    return this.personnelEmployeesService.create(user.sub, dto);
  }

  @Patch(':id')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.personnelEmployeesService.update(user.sub, id, dto);
  }

  @Post(':id/id-card/:side')
  @UseInterceptors(FileInterceptor('file'))
  uploadIdCard(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('side') side: 'front' | 'back',
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.personnelEmployeesService.uploadIdCard(user.sub, id, side, file);
  }

  @Delete(':id')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.personnelEmployeesService.remove(user.sub, id);
  }
}
