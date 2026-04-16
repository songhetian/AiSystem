import { Module } from "@nestjs/common";
import { CommonModule } from "../../common/common.module";
import { PersonnelDepartmentsController } from "./controllers/personnel-departments.controller";
import { PersonnelEmployeesController } from "./controllers/personnel-employees.controller";
import { PersonnelPositionsController } from "./controllers/personnel-positions.controller";
import { PersonnelDepartmentsService } from "./services/personnel-departments.service";
import { PersonnelEmployeesService } from "./services/personnel-employees.service";
import { PersonnelPositionsService } from "./services/personnel-positions.service";
import { PersonnelEmployeeHistoryService } from "./services/personnel-employee-history.service";

@Module({
  imports: [CommonModule],
  controllers: [
    PersonnelDepartmentsController,
    PersonnelPositionsController,
    PersonnelEmployeesController,
  ],
  providers: [
    PersonnelDepartmentsService,
    PersonnelPositionsService,
    PersonnelEmployeesService,
    PersonnelEmployeeHistoryService,
  ],
})
export class PersonnelModule {}
