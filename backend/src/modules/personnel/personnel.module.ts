import { Module } from '@nestjs/common';
import { CommonModule } from '../../common/common.module';
import { PersonnelDepartmentsController } from './controllers/personnel-departments.controller';
import { PersonnelEmployeesController } from './controllers/personnel-employees.controller';
import { PersonnelPositionsController } from './controllers/personnel-positions.controller';
import { PersonnelEmployeesService } from './services/personnel-employees.service';
import { PersonnelPositionsService } from './services/personnel-positions.service';

@Module({
  imports: [CommonModule],
  controllers: [
    PersonnelDepartmentsController,
    PersonnelPositionsController,
    PersonnelEmployeesController
  ],
  providers: [PersonnelPositionsService, PersonnelEmployeesService]
})
export class PersonnelModule {}
