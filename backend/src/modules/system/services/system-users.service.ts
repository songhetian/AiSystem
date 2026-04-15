import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from "@nestjs/common";
import {
  hashPassword,
  comparePassword,
} from "../../../common/utils/password.util";
import { PrismaService } from "../../../prisma/prisma.service";
import { ScopeService } from "../../../common/services/scope.service";
import { RedisService } from "../../../common/services/redis.service";
import { CurrentUserPayload } from "../../../common/current-user.decorator";
import { CreateUserDto } from "../dto/create-user.dto";
import { UpdateUserDto } from "../dto/update-user.dto";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Injectable()
export class SystemUsersService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly scopeService: ScopeService,
    private readonly redisService: RedisService,
  ) {}

  /**
   * 查询用户列表（带查询优化）
   * 监控慢查询，超时保护
   */
  @QueryOptimize({ timeout: 5000, slowQueryThreshold: 300 })
  async findAll(user: CurrentUserPayload) {
    const scope = await this.scopeService.resolveAccess(user.sub);
    return this.prisma.sys_user.findMany({
      where: this.scopeService.applyScope({ is_deleted: 0 }, scope, {
        platform: "platform_id",
        department: "dept_id",
        shop: "shop_id",
      }),
      orderBy: { create_time: "desc" },
    });
  }

  async create(dto: CreateUserDto) {
    const password = await hashPassword(dto.password);

    return this.prisma.sys_user.create({
      data: {
        username: dto.username,
        password,
        name: dto.name,
        phone: dto.phone,
        email: dto.email,
        status: dto.status ?? 1,
        platform_id: dto.platform_id,
        dept_id: dto.dept_id,
        shop_id: dto.shop_id,
      },
    });
  }

  /**
   * 更新用户信息（清除缓存）
   * 更新后自动清除该用户的所有缓存
   */
  @CacheEvict({ pattern: "cache:user-info:*" })
  async update(id: string, dto: UpdateUserDto, request?: any) {
    // 1. 获取变更前的状态 (用于 V6.0 差异审计)
    const oldUser = await this.prisma.sys_user.findUnique({ where: { id } });
    if (!oldUser) throw new NotFoundException("用户不存在");

    // 2. 执行更新
    const res = await this.prisma.sys_user.update({
      where: { id },
      data: dto,
    });

    // 3. 计算差异并附加到请求上下文 (由 Interceptor 自动提取并持久化)
    if (request && oldUser) {
      const { DiffUtil } = await import("../../../common/utils/diff.util");
      request.diffContent = DiffUtil.diff(oldUser, res);
    }

    // 高效率加固：清理鉴权缓存
    await this.clearUserCache(id);
    return res;
  }

  /**
   * 个人修改密码逻辑（清除缓存）
   */
  @CacheEvict({ pattern: "cache:user-info:*" })
  async updatePassword(userId: string, data: any) {
    const user = await this.prisma.sys_user.findUnique({
      where: { id: userId },
    });
    if (!user) throw new NotFoundException("用户不存在");

    const isMatch = await comparePassword(data.oldPassword, user.password);
    if (!isMatch) {
      throw new BadRequestException("原密码错误，请重新输入");
    }

    const hashedPassword = await hashPassword(data.newPassword);
    const res = await this.prisma.sys_user.update({
      where: { id: userId },
      data: { password: hashedPassword },
    });
    await this.clearUserCache(userId);
    return res;
  }

  /**
   * 重置密码（清除缓存）
   */
  @CacheEvict({ pattern: "cache:user-info:*" })
  async resetPassword(id: string, password = "Admin123456") {
    const res = await this.prisma.sys_user.update({
      where: { id },
      data: {
        password: await hashPassword(password),
      },
    });
    await this.clearUserCache(id);
    return res;
  }

  /**
   * 批量更新用户状态（清除缓存）
   */
  @CacheEvict({ pattern: "cache:user-info:*" })
  async batchUpdateStatus(ids: string[], status: number) {
    const res = await this.prisma.sys_user.updateMany({
      where: {
        id: { in: ids },
        is_deleted: 0,
      },
      data: { status },
    });
    // 批量清理
    for (const id of ids) {
      await this.clearUserCache(id);
    }
    return res;
  }

  /**
   * 批量重置密码（清除缓存）
   */
  @CacheEvict({ pattern: "cache:user-info:*" })
  async batchResetPassword(ids: string[], password: string) {
    const hashedPassword = await hashPassword(password);
    const res = await this.prisma.sys_user.updateMany({
      where: {
        id: { in: ids },
        is_deleted: 0,
      },
      data: { password: hashedPassword },
    });
    // 批量清理缓存
    for (const id of ids) {
      await this.clearUserCache(id);
    }
    return res;
  }

  /**
   * 批量分配角色（清除缓存）
   * 使用事务保证数据一致性
   */
  @CacheEvict({ pattern: "cache:user-info:*" })
  async batchAssignRoles(userIds: string[], roleIds: string[]) {
    // 使用事务批量操作
    return this.prisma.$transaction(async (tx) => {
      // 1. 删除这些用户的所有现有角色关联
      await tx.sys_user_role.deleteMany({
        where: { user_id: { in: userIds } },
      });

      // 2. 批量创建新的角色关联
      const userRoleData = userIds.flatMap((userId) =>
        roleIds.map((roleId) => ({
          user_id: userId,
          role_id: roleId,
        })),
      );

      await tx.sys_user_role.createMany({
        data: userRoleData,
      });

      // 3. 批量清理缓存
      for (const userId of userIds) {
        await this.clearUserCache(userId);
      }

      return { success: true, count: userIds.length };
    });
  }

  /**
   * 删除用户（清除缓存）
   */
  @CacheEvict({ pattern: "cache:user-info:*" })
  async remove(id: string) {
    const res = await this.prisma.sys_user.update({
      where: { id },
      data: { is_deleted: 1 },
    });
    await this.clearUserCache(id);
    return res;
  }

  private async clearUserCache(userId: string) {
    try {
      await this.redisService.del(`user_cache:${userId}`);
    } catch (e) {
      // 忽略缓存清理异常
    }
  }
}
