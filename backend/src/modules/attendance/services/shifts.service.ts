import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateShiftDto } from '../dto/create-shift.dto';
import { UpdateShiftDto } from '../dto/update-shift.dto';

@Injectable()
export class ShiftsService {
  constructor(private prisma: PrismaService) {}

  async create(createShiftDto: CreateShiftDto) {
    return this.prisma.attendance_rule.create({
      data: {
        name: createShiftDto.name,
        on_duty_time: createShiftDto.on_duty_time,
        off_duty_time: createShiftDto.off_duty_time,
        late_threshold: createShiftDto.late_threshold ?? 0,
        early_threshold: createShiftDto.early_threshold ?? 0,
        absenteeism_threshold: createShiftDto.absenteeism_threshold ?? 0,
        platform_id: createShiftDto.platform_id,
        dept_id: createShiftDto.dept_id,
        status: createShiftDto.status ?? 1,
      },
    });
  }

  async findAll(query: { platform_id?: string; dept_id?: string; name?: string }) {
    return this.prisma.attendance_rule.findMany({
      where: {
        is_deleted: 0,
        platform_id: query.platform_id,
        dept_id: query.dept_id,
        name: query.name ? { contains: query.name } : undefined,
      },
      orderBy: { create_time: 'desc' },
    });
  }

  async findOne(id: string) {
    const shift = await this.prisma.attendance_rule.findUnique({
      where: { id, is_deleted: 0 },
    });
    if (!shift) throw new NotFoundException('班次不存在');
    return shift;
  }

  async update(id: string, updateShiftDto: UpdateShiftDto) {
    await this.findOne(id);
    return this.prisma.attendance_rule.update({
      where: { id },
      data: {
        ...updateShiftDto,
      },
    });
  }

  async remove(id: string) {
    await this.findOne(id);
    return this.prisma.attendance_rule.update({
      where: { id },
      data: { is_deleted: 1 },
    });
  }
}
