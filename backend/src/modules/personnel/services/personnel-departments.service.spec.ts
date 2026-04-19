import { Test, TestingModule } from "@nestjs/testing";
import { NotFoundException, ForbiddenException } from "@nestjs/common";
import { PersonnelDepartmentsService } from "./personnel-departments.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { ScopeService } from "../../../common/services/scope.service";
import { createMockUser } from "../../../../test/helpers/test-utils";

describe("PersonnelDepartmentsService", () => {
  let service: PersonnelDepartmentsService;
  let prisma: PrismaService;
  let scopeService: ScopeService;

  const mockPrisma = {
    biz_department: {
      findMany: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrisma)),
  };

  const mockScopeService = {
    resolveAccess: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PersonnelDepartmentsService,
        {
          provide: PrismaService,
          useValue: mockPrisma,
        },
        {
          provide: ScopeService,
          useValue: mockScopeService,
        },
      ],
    }).compile();

    service = module.get<PersonnelDepartmentsService>(
      PersonnelDepartmentsService,
    );
    prisma = module.get<PrismaService>(PrismaService);
    scopeService = module.get<ScopeService>(ScopeService);

    // 重置所有 mock
    jest.clearAllMocks();
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe("findAll", () => {
    it("应该返回部门列表", async () => {
      const mockUser = createMockUser();
      const mockScope = {
        platform_id: "test-platform",
        dept_id: "test-dept",
      };
      const mockDepartments = [
        {
          id: "dept-1",
          name: "技术部",
          code: "TECH",
          status: 1,
          is_deleted: 0,
        },
        {
          id: "dept-2",
          name: "市场部",
          code: "MARKET",
          status: 1,
          is_deleted: 0,
        },
      ];

      mockScopeService.resolveAccess.mockResolvedValue(mockScope);
      mockPrisma.biz_department.findMany.mockResolvedValue(mockDepartments);
      mockPrisma.biz_department.count.mockResolvedValue(2);

      const pagination = new (await import("../../../common/dto/pagination.dto")).PaginationDto();
      pagination.page = 1;
      pagination.pageSize = 10;

      const result = await service.findAll(mockUser.sub, pagination);

      expect(result).toEqual({
        data: mockDepartments,
        total: 2,
        page: 1,
        pageSize: 10,
      });
      expect(scopeService.resolveAccess).toHaveBeenCalledWith(mockUser.sub);
      expect(prisma.biz_department.findMany).toHaveBeenCalled();
    });

    it("应该根据关键词过滤部门", async () => {
      const mockUser = createMockUser();
      const mockScope = {
        platform_id: "test-platform",
        dept_id: "test-dept",
      };

      mockScopeService.resolveAccess.mockResolvedValue(mockScope);
      mockPrisma.biz_department.findMany.mockResolvedValue([]);
      mockPrisma.biz_department.count.mockResolvedValue(0);

      const pagination = new (await import("../../../common/dto/pagination.dto")).PaginationDto();
      pagination.page = 1;
      pagination.pageSize = 10;

      // 添加keyword属性到pagination对象
      (pagination as any).keyword = "技术";

      await service.findAll(mockUser.sub, pagination);

      expect(prisma.biz_department.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            OR: expect.arrayContaining([
              expect.objectContaining({
                name: expect.objectContaining({ contains: "技术" }),
              }),
              expect.objectContaining({
                code: expect.objectContaining({ contains: "技术" }),
              }),
            ]),
          }),
        }),
      );
    });
  });

  describe("findOne", () => {
    it("应该返回指定部门详情", async () => {
      const mockUser = createMockUser();
      const mockScope = {
        platform_id: "test-platform",
        dept_id: "test-dept",
      };
      const mockDepartment = {
        id: "dept-1",
        name: "技术部",
        code: "TECH",
        status: 1,
        is_deleted: 0,
      };

      mockScopeService.resolveAccess.mockResolvedValue(mockScope);
      mockPrisma.biz_department.findUnique.mockResolvedValue(mockDepartment);

      const result = await service.findOne(mockUser.sub, "dept-1");

      expect(result).toEqual(mockDepartment);
      expect(prisma.biz_department.findUnique).toHaveBeenCalledWith({
        where: { id: "dept-1" },
      });
    });

    it("当部门不存在时应该抛出 NotFoundException", async () => {
      const mockUser = createMockUser();
      const mockScope = {
        platform_id: "test-platform",
        dept_id: "test-dept",
      };

      mockScopeService.resolveAccess.mockResolvedValue(mockScope);
      mockPrisma.biz_department.findUnique.mockResolvedValue(null);

      await expect(
        service.findOne(mockUser.sub, "non-existent"),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("create", () => {
    it("应该创建新部门", async () => {
      const mockUser = createMockUser();
      const mockScope = {
        platform_id: "test-platform",
        dept_id: "test-dept",
      };
      const createDto = {
        name: "新部门",
        parent_id: undefined, // 使用undefined而不是null
        sort: 0,
      };
      const mockCreatedDepartment = {
        id: "new-dept-id",
        ...createDto,
        status: 1,
        is_deleted: 0,
        create_time: new Date(),
        update_time: new Date(),
      };

      mockScopeService.resolveAccess.mockResolvedValue(mockScope);
      mockPrisma.biz_department.create.mockResolvedValue(mockCreatedDepartment);

      const result = await service.create(mockUser.sub, createDto);

      expect(result).toEqual(mockCreatedDepartment);
      expect(prisma.biz_department.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            name: createDto.name,
            platform_id: mockScope.platform_id,
          }),
        }),
      );
    });
  });

  describe("update", () => {
    it("应该更新部门信息", async () => {
      const mockUser = createMockUser();
      const mockScope = {
        platform_id: "test-platform",
        dept_id: "test-dept",
      };
      const updateDto = {
        name: "更新后的部门名",
      };
      const mockExistingDepartment = {
        id: "dept-1",
        name: "原部门名",
        code: "DEPT",
        status: 1,
        is_deleted: 0,
      };
      const mockUpdatedDepartment = {
        ...mockExistingDepartment,
        ...updateDto,
      };

      mockScopeService.resolveAccess.mockResolvedValue(mockScope);
      mockPrisma.biz_department.findUnique.mockResolvedValue(
        mockExistingDepartment,
      );
      mockPrisma.biz_department.update.mockResolvedValue(mockUpdatedDepartment);

      const result = await service.update(mockUser.sub, "dept-1", updateDto);

      expect(result).toEqual(mockUpdatedDepartment);
      expect(prisma.biz_department.update).toHaveBeenCalledWith({
        where: { id: "dept-1" },
        data: updateDto,
      });
    });

    it("当部门不存在时应该抛出 NotFoundException", async () => {
      const mockUser = createMockUser();
      const mockScope = {
        platform_id: "test-platform",
        dept_id: "test-dept",
      };

      mockScopeService.resolveAccess.mockResolvedValue(mockScope);
      mockPrisma.biz_department.findUnique.mockResolvedValue(null);

      await expect(
        service.update(mockUser.sub, "non-existent", { name: "新名称" }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe("remove", () => {
    it("应该软删除部门", async () => {
      const mockUser = createMockUser();
      const mockScope = {
        platform_id: "test-platform",
        dept_id: "test-dept",
      };
      const mockDepartment = {
        id: "dept-1",
        name: "待删除部门",
        code: "DEL",
        status: 1,
        is_deleted: 0,
      };

      mockScopeService.resolveAccess.mockResolvedValue(mockScope);
      mockPrisma.biz_department.findUnique.mockResolvedValue(mockDepartment);
      mockPrisma.biz_department.update.mockResolvedValue({
        ...mockDepartment,
        is_deleted: 1,
      });

      await service.remove(mockUser.sub, "dept-1");

      expect(prisma.biz_department.update).toHaveBeenCalledWith({
        where: { id: "dept-1" },
        data: { is_deleted: 1 },
      });
    });
  });
});
