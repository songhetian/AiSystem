import { Body, Controller, Delete, Get, Param, Patch, Post, UploadedFile, UseInterceptors } from '@nestjs/common';
import { CurrentUser, type CurrentUserPayload } from '../../../common/current-user.decorator';
import { FileInterceptor } from '@nestjs/platform-express';
import { Permission } from '../../../common/permission.decorator';
import { BatchUpdateEmployeeStatusDto } from '../dto/batch-update-employee-status.dto';
import { CreateEmployeeDto } from '../dto/create-employee.dto';
import { UpdateEmployeeDto } from '../dto/update-employee.dto';
import { PersonnelEmployeesService } from '../services/personnel-employees.service';

@Controller('personnel/employees')
export class PersonnelEmployeesController {
  constructor(private readonly personnelEmployeesService: PersonnelEmployeesService) {}

  @Get()
  @Permission('personnel:employee:list')
  findAll(@CurrentUser() user: CurrentUserPayload) {
    return this.personnelEmployeesService.findAll(user.sub);
  }

  @Post()
  @Permission('personnel:employee:create')
  create(@CurrentUser() user: CurrentUserPayload, @Body() dto: CreateEmployeeDto) {
    return this.personnelEmployeesService.create(user.sub, dto);
  }

  @Patch('batch/status')
  @Permission('personnel:employee:batch-status')
  batchUpdateStatus(@CurrentUser() user: CurrentUserPayload, @Body() dto: BatchUpdateEmployeeStatusDto) {
    return this.personnelEmployeesService.batchUpdateStatus(user.sub, dto.ids, dto.status);
  }

  @Patch(':id')
  @Permission('personnel:employee:update')
  update(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string, @Body() dto: UpdateEmployeeDto) {
    return this.personnelEmployeesService.update(user.sub, id, dto);
  }

  @Post(':id/id-card/:side')
  @Permission('personnel:employee:id-card-upload')
  @UseInterceptors(FileInterceptor('file'))
  uploadIdCard(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('side') side: 'front' | 'back',
    @UploadedFile() file: Express.Multer.File
  ) {
    return this.personnelEmployeesService.uploadIdCard(user.sub, id, side, file);
  }

  @Get(':id/id-card/:side')
  @Permission('personnel:employee:id-card-view')
  getIdCardUrl(
    @CurrentUser() user: CurrentUserPayload,
    @Param('id') id: string,
    @Param('side') side: 'front' | 'back'
  ) {
    return this.personnelEmployeesService.getIdCardUrl(user.sub, id, side);
  }

  @Delete(':id')
  @Permission('personnel:employee:delete')
  remove(@CurrentUser() user: CurrentUserPayload, @Param('id') id: string) {
    return this.personnelEmployeesService.remove(user.sub, id);
  }
}
