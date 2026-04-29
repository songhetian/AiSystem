import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../../../prisma/prisma.service';
import { CreateActivityDto } from '../dto/create-activity.dto';
import { UpdateActivityDto } from '../dto/update-activity.dto';
import { QueryActivityDto } from '../dto/query-activity.dto';

@Injectable()
export class ActivityService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * 创建活动
   */
  async create(userId: string, createDto: CreateActivityDto) {
    const { rules, ...activityData } = createDto;

    // 验证时间
    const startTime = new Date(createDto.start_time);
    const endTime = new Date(createDto.end_time);
    if (startTime >= endTime) {
      throw new BadRequestException('结束时间必须大于开始时间');
    }

    // 创建活动和规则
    const activity = await this.prisma.biz_activity.create({
      data: {
        ...activityData,
        start_time: startTime,
        end_time: endTime,
      },
    });

    // 创建活动规则
    if (rules && rules.length > 0) {
      await this.prisma.biz_activity_rule.createMany({
        data: rules.map((rule, index) => ({
          activity_id: activity.id,
          rule_name: rule.rule_name,
          rule_type: rule.rule_type,
          rule_config: rule.rule_config,
          priority: rule.priority || 3,
          sort: rule.sort !== undefined ? rule.sort : index,
          status: rule.status !== undefined ? rule.status : 1,
        })),
      });
    }

    return this.findOne(activity.id);
  }

  /**
   * 查询活动列表
   */
  async findAll(query: QueryActivityDto) {
    const { page = 1, pageSize = 10, keyword, ...filters } = query;
    const skip = (page - 1) * pageSize;

    const where: any = {
      is_deleted: 0,
    };

    // 关键词搜索
    if (keyword) {
      where.activity_name = { contains: keyword };
    }

    // 其他过滤条件
    if (filters.activity_type) {
      where.activity_type = filters.activity_type;
    }
    if (filters.platform_id) {
      where.platform_id = filters.platform_id;
    }
    if (filters.dept_id) {
      where.dept_id = filters.dept_id;
    }
    if (filters.shop_id) {
      where.shop_id = filters.shop_id;
    }
    if (filters.status !== undefined) {
      where.status = filters.status;
    }

    // 时间范围过滤
    if (filters.start_time_from || filters.start_time_to) {
      where.start_time = {};
      if (filters.start_time_from) {
        where.start_time.gte = new Date(filters.start_time_from);
      }
      if (filters.start_time_to) {
        where.start_time.lte = new Date(filters.start_time_to);
      }
    }

    const [items, total] = await Promise.all([
      this.prisma.biz_activity.findMany({
        where,
        skip,
        take: pageSize,
        orderBy: [{ sort: 'asc' }, { create_time: 'desc' }],
      }),
      this.prisma.biz_activity.count({ where }),
    ]);

    return {
      items,
      total,
      page,
      pageSize,
      totalPages: Math.ceil(total / pageSize),
    };
  }

  /**
   * 查询单个活动详情
   */
  async findOne(id: string) {
    const activity = await this.prisma.biz_activity.findFirst({
      where: { id, is_deleted: 0 },
    });

    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    // 查询活动规则
    const rules = await this.prisma.biz_activity_rule.findMany({
      where: { activity_id: id, is_deleted: 0 },
      orderBy: [{ sort: 'asc' }, { create_time: 'asc' }],
    });

    return {
      ...activity,
      rules,
    };
  }

  /**
   * 更新活动
   */
  async update(id: string, userId: string, updateDto: UpdateActivityDto) {
    const activity = await this.prisma.biz_activity.findFirst({
      where: { id, is_deleted: 0 },
    });

    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    const { rules, ...activityData } = updateDto;

    // 验证时间
    if (updateDto.start_time && updateDto.end_time) {
      const startTime = new Date(updateDto.start_time);
      const endTime = new Date(updateDto.end_time);
      if (startTime >= endTime) {
        throw new BadRequestException('结束时间必须大于开始时间');
      }
    }

    // 更新活动基本信息
    const updateData: any = { ...activityData };
    if (updateDto.start_time) {
      updateData.start_time = new Date(updateDto.start_time);
    }
    if (updateDto.end_time) {
      updateData.end_time = new Date(updateDto.end_time);
    }

    await this.prisma.biz_activity.update({
      where: { id },
      data: updateData,
    });

    // 更新规则（如果提供）
    if (rules) {
      // 删除旧规则
      await this.prisma.biz_activity_rule.updateMany({
        where: { activity_id: id },
        data: { is_deleted: 1 },
      });

      // 创建新规则
      if (rules.length > 0) {
        await this.prisma.biz_activity_rule.createMany({
          data: rules.map((rule, index) => ({
            activity_id: id,
            rule_name: rule.rule_name,
            rule_type: rule.rule_type,
            rule_config: rule.rule_config,
            priority: rule.priority || 3,
            sort: rule.sort !== undefined ? rule.sort : index,
            status: rule.status !== undefined ? rule.status : 1,
          })),
        });
      }
    }

    return this.findOne(id);
  }

  /**
   * 删除活动
   */
  async remove(id: string, userId: string) {
    const activity = await this.prisma.biz_activity.findFirst({
      where: { id, is_deleted: 0 },
    });

    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    // 软删除活动
    await this.prisma.biz_activity.update({
      where: { id },
      data: { is_deleted: 1 },
    });

    // 软删除关联规则
    await this.prisma.biz_activity_rule.updateMany({
      where: { activity_id: id },
      data: { is_deleted: 1 },
    });

    return { success: true, message: '删除成功' };
  }

  /**
   * 更新活动状态
   */
  async updateStatus(id: string, userId: string, status: number) {
    const activity = await this.prisma.biz_activity.findFirst({
      where: { id, is_deleted: 0 },
    });

    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    await this.prisma.biz_activity.update({
      where: { id },
      data: { status },
    });

    return { success: true, message: '状态更新成功' };
  }

  /**
   * 更新规则排序
   */
  async updateRuleSort(activityId: string, userId: string, ruleIds: string[]) {
    const activity = await this.prisma.biz_activity.findFirst({
      where: { id: activityId, is_deleted: 0 },
    });

    if (!activity) {
      throw new NotFoundException('活动不存在');
    }

    // 批量更新排序
    const updates = ruleIds.map((ruleId, index) =>
      this.prisma.biz_activity_rule.updateMany({
        where: { id: ruleId, activity_id: activityId, is_deleted: 0 },
        data: { sort: index },
      }),
    );

    await Promise.all(updates);

    return { success: true, message: '排序更新成功' };
  }

  /**
   * 获取活动统计
   */
  async getStatistics(query: { platform_id?: string; dept_id?: string; shop_id?: string }) {
    const where: any = { is_deleted: 0 };

    if (query.platform_id) {
      where.platform_id = query.platform_id;
    }
    if (query.dept_id) {
      where.dept_id = query.dept_id;
    }
    if (query.shop_id) {
      where.shop_id = query.shop_id;
    }

    const now = new Date();

    const [total, active, upcoming, expired] = await Promise.all([
      this.prisma.biz_activity.count({ where }),
      this.prisma.biz_activity.count({
        where: {
          ...where,
          status: 1,
          start_time: { lte: now },
          end_time: { gte: now },
        },
      }),
      this.prisma.biz_activity.count({
        where: {
          ...where,
          status: 1,
          start_time: { gt: now },
        },
      }),
      this.prisma.biz_activity.count({
        where: {
          ...where,
          end_time: { lt: now },
        },
      }),
    ]);

    return {
      total,
      active,
      upcoming,
      expired,
    };
  }
}
