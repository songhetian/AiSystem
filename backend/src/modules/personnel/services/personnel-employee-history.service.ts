import { Injectable } from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { ScopeService } from "../../../common/services/scope.service";
import { Cache } from "../../../common/decorators/cache.decorator";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

/**
 * 员工履历服务
 * 自动记录员工的入职、调岗、晋升、转正、离职等关键事件
 */
@Injectable()
export class PersonnelEmployeeHistoryService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
  ) {}

  /**
   * 记录员工履历
   */
  @CacheEvict({ pattern: "cache:employee-history:*" })
  async recordHistory(data: {
    employeeId: string;
    eventType:
      | "onboard"
      | "transfer"
      | "promotion"
      | "regularization"
      | "resignation"
      | "status_change";
    eventDate: Date;
    beforeData?: any;
    afterData?: any;
    departmentId?: string;
    positionId?: string;
    remark?: string;
    operatorId?: string;
    operatorName?: string;
    platformId?: string;
  }) {
    return this.prisma.hr_employee_history.create({
      data: {
        employee_id: data.employeeId,
        event_type: data.eventType,
        event_date: data.eventDate,
        before_data: data.beforeData,
        after_data: data.afterData,
        department_id: data.departmentId,
        position_id: data.positionId,
        remark: data.remark,
        operator_id: data.operatorId,
        operator_name: data.operatorName,
        platform_id: data.platformId,
      },
    });
  }

  /**
   * 获取员工履历列表
   */
  @Cache({ ttl: 300, byUser: true, prefix: "employee-history" })
  @QueryOptimize({ timeout: 3000, slowQueryThreshold: 200 })
  async getEmployeeHistory(userId: string, employeeId: string) {
    const scope = await this.scopeService.resolveAccess(userId);

    // 验证员工权限
    const employee = await this.prisma.hr_employee.findUnique({
      where: { id: employeeId },
    });

    if (employee) {
      this.scopeService.assertPlatformAccess(scope, employee.platform_id);
      this.scopeService.assertDepartmentAccess(scope, employee.department_id);
    }

    return this.prisma.hr_employee_history.findMany({
      where: {
        employee_id: employeeId,
        is_deleted: 0,
      },
      select: {
        id: true,
        employee_id: true,
        event_type: true,
        event_date: true,
        before_data: true,
        after_data: true,
        department_id: true,
        position_id: true,
        remark: true,
        operator_id: true,
        operator_name: true,
        create_time: true,
        biz_department: {
          select: {
            id: true,
            name: true,
          },
        },
        hr_position: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        event_date: "desc",
      },
    });
  }

  /**
   * 自动记录入职履历
   */
  async recordOnboard(
    employeeId: string,
    employeeData: any,
    operatorId?: string,
    operatorName?: string,
  ) {
    return this.recordHistory({
      employeeId,
      eventType: "onboard",
      eventDate: employeeData.join_date || new Date(),
      afterData: {
        name: employeeData.name,
        employee_no: employeeData.employee_no,
        department_id: employeeData.department_id,
        position_id: employeeData.position_id,
        status: employeeData.status,
      },
      departmentId: employeeData.department_id,
      positionId: employeeData.position_id,
      remark: "员工入职",
      operatorId,
      operatorName,
      platformId: employeeData.platform_id,
    });
  }

  /**
   * 自动记录调岗履历
   */
  async recordTransfer(
    employeeId: string,
    beforeData: any,
    afterData: any,
    operatorId?: string,
    operatorName?: string,
  ) {
    const isDepartmentChange =
      beforeData.department_id !== afterData.department_id;
    const isPositionChange = beforeData.position_id !== afterData.position_id;

    if (isDepartmentChange || isPositionChange) {
      return this.recordHistory({
        employeeId,
        eventType: "transfer",
        eventDate: new Date(),
        beforeData: {
          department_id: beforeData.department_id,
          position_id: beforeData.position_id,
        },
        afterData: {
          department_id: afterData.department_id,
          position_id: afterData.position_id,
        },
        departmentId: afterData.department_id,
        positionId: afterData.position_id,
        remark:
          isDepartmentChange && isPositionChange
            ? "部门和岗位调整"
            : isDepartmentChange
              ? "部门调整"
              : "岗位调整",
        operatorId,
        operatorName,
        platformId: afterData.platform_id,
      });
    }
  }

  /**
   * 自动记录转正履历
   */
  async recordRegularization(
    employeeId: string,
    regularizationDate: Date,
    employeeData: any,
    operatorId?: string,
    operatorName?: string,
  ) {
    return this.recordHistory({
      employeeId,
      eventType: "regularization",
      eventDate: regularizationDate,
      afterData: {
        regularization_date: regularizationDate,
      },
      departmentId: employeeData.department_id,
      positionId: employeeData.position_id,
      remark: "员工转正",
      operatorId,
      operatorName,
      platformId: employeeData.platform_id,
    });
  }

  /**
   * 自动记录离职履历
   */
  async recordResignation(
    employeeId: string,
    employeeData: any,
    operatorId?: string,
    operatorName?: string,
  ) {
    return this.recordHistory({
      employeeId,
      eventType: "resignation",
      eventDate: new Date(),
      beforeData: {
        status: employeeData.status,
        department_id: employeeData.department_id,
        position_id: employeeData.position_id,
      },
      afterData: {
        status: 0, // 离职状态
      },
      departmentId: employeeData.department_id,
      positionId: employeeData.position_id,
      remark: "员工离职",
      operatorId,
      operatorName,
      platformId: employeeData.platform_id,
    });
  }

  /**
   * 自动记录状态变更履历
   */
  async recordStatusChange(
    employeeId: string,
    beforeStatus: number,
    afterStatus: number,
    employeeData: any,
    operatorId?: string,
    operatorName?: string,
  ) {
    if (beforeStatus !== afterStatus) {
      const statusMap: Record<number, string> = {
        0: "离职/禁用",
        1: "在职",
        2: "试用期",
      };

      return this.recordHistory({
        employeeId,
        eventType: "status_change",
        eventDate: new Date(),
        beforeData: {
          status: beforeStatus,
        },
        afterData: {
          status: afterStatus,
        },
        departmentId: employeeData.department_id,
        positionId: employeeData.position_id,
        remark: `状态从"${statusMap[beforeStatus] || beforeStatus}"变更为"${statusMap[afterStatus] || afterStatus}"`,
        operatorId,
        operatorName,
        platformId: employeeData.platform_id,
      });
    }
  }
}
