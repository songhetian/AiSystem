import {
  Injectable,
  BadRequestException,
  NotFoundException,
  Logger,
} from "@nestjs/common";
import { PrismaService } from "../../../prisma/prisma.service";
import { RedisService } from "../../../common/services/redis.service";
import { hashPassword } from "../../../common/utils/password.util";
import { RegisterDto, SendCodeDto } from "../dto/register.dto";
import {
  ApproveRegisterDto,
  BatchApproveRegisterDto,
} from "../dto/approve-register.dto";
import {
  PaginationDto,
  PaginatedResponse,
} from "../../../common/dto/pagination.dto";
import { PaginationService } from "../../../common/services/pagination.service";
import { CacheEvict } from "../../../common/decorators/cache-evict.decorator";
import { QueryOptimize } from "../../../common/decorators/query-optimize.decorator";

@Injectable()
export class RegisterService {
  private readonly logger = new Logger(RegisterService.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redisService: RedisService,
    private readonly paginationService: PaginationService,
  ) {}

  /**
   * 生成注册图形验证码
   * 改为图形验证码，不再发送短信
   */
  async generateCaptcha(): Promise<{
    success: boolean;
    captchaKey: string;
    captchaImage: string;
  }> {
    // 生成4位数字验证码
    const code = Math.floor(1000 + Math.random() * 9000).toString();
    const captchaKey = `register_captcha:${Date.now()}:${Math.random()}`;

    // 存储验证码，有效期5分钟
    await this.redisService.set(captchaKey, code, 300);

    // 生成SVG图形验证码
    const svg = this.generateCaptchaSvg(code);

    console.log(
      `[注册验证码] Key: ${captchaKey}, 验证码: ${code}, 有效期: 5分钟`,
    );

    return {
      success: true,
      captchaKey,
      captchaImage: `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`,
    };
  }

  /**
   * 生成SVG验证码图片
   */
  private generateCaptchaSvg(code: string): string {
    const width = 120;
    const height = 40;
    const fontSize = 24;

    // 随机颜色
    const randomColor = () => {
      const r = Math.floor(Math.random() * 200);
      const g = Math.floor(Math.random() * 200);
      const b = Math.floor(Math.random() * 200);
      return `rgb(${r},${g},${b})`;
    };

    // 生成干扰线
    let lines = "";
    for (let i = 0; i < 3; i++) {
      const x1 = Math.random() * width;
      const y1 = Math.random() * height;
      const x2 = Math.random() * width;
      const y2 = Math.random() * height;
      lines += `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${randomColor()}" stroke-width="1" opacity="0.3"/>`;
    }

    // 生成字符
    let chars = "";
    for (let i = 0; i < code.length; i++) {
      const x = 15 + i * 25;
      const y = 25 + Math.random() * 5;
      const rotate = -15 + Math.random() * 30;
      chars += `<text x="${x}" y="${y}" font-size="${fontSize}" fill="${randomColor()}" transform="rotate(${rotate} ${x} ${y})" font-weight="bold">${code[i]}</text>`;
    }

    return `
      <svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
        <rect width="${width}" height="${height}" fill="#f0f0f0"/>
        ${lines}
        ${chars}
      </svg>
    `;
  }

  /**
   * 检查手机号是否已注册
   */
  async checkPhone(
    phone: string,
  ): Promise<{ available: boolean; message: string }> {
    const existingUser = await this.prisma.sys_user.findFirst({
      where: {
        phone,
        is_deleted: 0,
      },
    });

    if (existingUser) {
      return {
        available: false,
        message: "该手机号已注册，请直接登录或找回密码",
      };
    }

    return {
      available: true,
      message: "该手机号可以注册",
    };
  }

  /**
   * 用户注册
   */
  async register(
    dto: RegisterDto,
  ): Promise<{ success: boolean; message: string }> {
    const { name, phone, deptId, password, code, codeKey } = dto;

    // 1. 验证图形验证码
    if (!codeKey) {
      throw new BadRequestException("验证码Key不能为空");
    }

    const storedCode = await this.redisService.get(codeKey);

    if (!storedCode) {
      throw new BadRequestException("验证码已过期，请重新获取");
    }

    if (storedCode.toLowerCase() !== code.toLowerCase()) {
      throw new BadRequestException("验证码错误，请重新输入");
    }

    // 2. 再次检查手机号是否已注册（防止并发注册）
    const existingUser = await this.prisma.sys_user.findFirst({
      where: {
        phone,
        is_deleted: 0,
      },
    });

    if (existingUser) {
      throw new BadRequestException("该手机号已注册，请直接登录");
    }

    // 3. 验证部门是否存在
    const department = await this.prisma.biz_department.findUnique({
      where: { id: deptId },
    });

    if (!department || department.is_deleted === 1) {
      throw new BadRequestException("所选部门不存在或已被删除");
    }

    // 4. 加密密码
    const hashedPassword = await hashPassword(password);

    // 5. 创建注册申请记录
    await this.prisma.sys_user_register.create({
      data: {
        name,
        phone,
        dept_id: deptId,
        password: hashedPassword,
        status: "pending", // 待审核
        platform_id: department.platform_id,
      },
    });

    // 6. 删除验证码
    await this.redisService.del(codeKey);

    return {
      success: true,
      message: "注册申请提交成功，请等待管理员审核，审核通过后即可登录",
    };
  }

  /**
   * 获取注册申请列表（管理员）
   */
  @QueryOptimize({ timeout: 5000, slowQueryThreshold: 300 })
  async getRegisterList(
    pagination: PaginationDto,
    filters?: {
      status?: string;
      keyword?: string;
      deptId?: string;
    },
  ): Promise<PaginatedResponse<any>> {
    const where: any = {};

    // 状态筛选
    if (filters?.status) {
      where.status = filters.status;
    }

    // 关键词搜索（姓名或手机号）
    if (filters?.keyword) {
      where.OR = [
        { name: { contains: filters.keyword } },
        { phone: { contains: filters.keyword } },
      ];
    }

    // 部门筛选
    if (filters?.deptId) {
      where.dept_id = filters.deptId;
    }

    const { skip, take } = this.paginationService.calculatePagination(
      pagination.page,
      pagination.pageSize,
    );

    const [data, total] = await Promise.all([
      this.prisma.sys_user_register.findMany({
        where,
        skip,
        take,
        orderBy: { create_time: "desc" },
        include: {
          biz_department: {
            select: {
              id: true,
              name: true,
            },
          },
          approver: {
            select: {
              id: true,
              name: true,
              username: true,
            },
          },
        },
      }),
      this.prisma.sys_user_register.count({ where }),
    ]);

    // 隐藏密码字段
    const sanitizedData = data.map((item) => {
      const { password, ...rest } = item;
      return rest;
    });

    return this.paginationService.createResponse(
      sanitizedData,
      total,
      pagination.page,
      pagination.pageSize,
    );
  }

  /**
   * 获取注册申请详情（管理员）
   */
  async getRegisterDetail(id: string): Promise<any> {
    const register = await this.prisma.sys_user_register.findUnique({
      where: { id },
      include: {
        biz_department: {
          select: {
            id: true,
            name: true,
          },
        },
        approver: {
          select: {
            id: true,
            name: true,
            username: true,
          },
        },
      },
    });

    if (!register) {
      throw new NotFoundException("注册申请不存在");
    }

    // 隐藏密码字段
    const { password, ...rest } = register;
    return rest;
  }

  /**
   * 审核注册申请（管理员）
   */
  @CacheEvict({ pattern: "cache:user-*" })
  async approveRegister(
    dto: ApproveRegisterDto,
    approverId: string,
  ): Promise<{ success: boolean; message: string }> {
    const { id, status, rejectReason } = dto;

    // 1. 查找注册申请
    const register = await this.prisma.sys_user_register.findUnique({
      where: { id },
      include: {
        biz_department: true,
      },
    });

    if (!register) {
      throw new NotFoundException("注册申请不存在");
    }

    if (register.status !== "pending") {
      throw new BadRequestException("该申请已被审核，无法重复审核");
    }

    // 2. 审核通过：创建用户账号
    if (status === "approved") {
      // 检查手机号是否已被占用
      const existingUser = await this.prisma.sys_user.findFirst({
        where: {
          phone: register.phone,
          is_deleted: 0,
        },
      });

      if (existingUser) {
        throw new BadRequestException("该手机号已被其他用户使用，无法通过审核");
      }

      // 使用事务创建用户
      await this.prisma.$transaction(async (tx) => {
        // 创建用户账号
        await tx.sys_user.create({
          data: {
            username: register.phone, // 使用手机号作为用户名
            name: register.name,
            phone: register.phone,
            password: register.password, // 已加密的密码
            status: 1, // 启用状态
            platform_id: register.platform_id,
            dept_id: register.dept_id,
          },
        });

        // 更新注册申请状态
        await tx.sys_user_register.update({
          where: { id },
          data: {
            status: "approved",
            approve_time: new Date(),
            approver_id: approverId,
          },
        });
      });

      // TODO: 发送审核通过短信通知
      this.logger.log(
        `[注册审核通过] 手机号: ${register.phone}, 姓名: ${register.name}`,
      );

      return {
        success: true,
        message: "审核通过，用户账号已创建",
      };
    }

    // 3. 审核拒绝
    if (status === "rejected") {
      if (!rejectReason) {
        throw new BadRequestException("拒绝审核时必须填写拒绝原因");
      }

      await this.prisma.sys_user_register.update({
        where: { id },
        data: {
          status: "rejected",
          reject_reason: rejectReason,
          approve_time: new Date(),
          approver_id: approverId,
        },
      });

      // TODO: 发送审核拒绝短信通知
      this.logger.log(
        `[注册审核拒绝] 手机号: ${register.phone}, 姓名: ${register.name}, 原因: ${rejectReason}`,
      );

      return {
        success: true,
        message: "已拒绝该注册申请",
      };
    }

    throw new BadRequestException("无效的审核状态");
  }

  /**
   * 批量审核注册申请（管理员）
   */
  @CacheEvict({ pattern: "cache:user-*" })
  async batchApproveRegister(
    dto: BatchApproveRegisterDto,
    approverId: string,
  ): Promise<{
    success: boolean;
    message: string;
    successCount: number;
    failedCount: number;
  }> {
    const { ids, status, rejectReason } = dto;

    if (status === "rejected" && !rejectReason) {
      throw new BadRequestException("批量拒绝时必须填写拒绝原因");
    }

    let successCount = 0;
    let failedCount = 0;

    for (const id of ids) {
      try {
        await this.approveRegister({ id, status, rejectReason }, approverId);
        successCount++;
      } catch (error) {
        failedCount++;
        this.logger.error(
          `批量审核失败 - ID: ${id}, 错误: ${error instanceof Error ? error.message : "Unknown error"}`,
          error instanceof Error ? error.stack : undefined,
        );
      }
    }

    return {
      success: true,
      message: `批量审核完成，成功: ${successCount}，失败: ${failedCount}`,
      successCount,
      failedCount,
    };
  }
}
