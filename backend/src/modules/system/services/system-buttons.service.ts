import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateButtonDto } from '../dto/create-button.dto';
import { UpdateButtonDto } from '../dto/update-button.dto';

@Injectable()
export class SystemButtonsService {
  constructor(private readonly prisma: PrismaService) {}

  findAll() {
    return this.prisma.sys_button.findMany({
      where: { is_deleted: 0 },
      include: {
        menu: true
      },
      orderBy: { create_time: 'desc' }
    });
  }

  create(dto: CreateButtonDto) {
    return this.prisma.sys_button.create({
      data: {
        button_name: dto.button_name,
        button_code: dto.button_code,
        menu_id: dto.menu_id,
        status: dto.status
      }
    });
  }

  update(id: string, dto: UpdateButtonDto) {
    return this.prisma.sys_button.update({
      where: { id },
      data: dto
    });
  }

  remove(id: string) {
    return this.prisma.sys_button.update({
      where: { id },
      data: { is_deleted: 1 }
    });
  }
}
