import { Test, TestingModule } from '@nestjs/testing';
import { IdConverterService } from './id-converter.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';

describe('IdConverterService', () => {
  let service: IdConverterService;
  let prisma: PrismaService;
  let redis: RedisService;

  // Mock data
  const mockUsers = [
    { id: 'user-1', name: '张三', is_deleted: 0 },
    { id: 'user-2', name: '李四', is_deleted: 0 },
    { id: 'user-deleted', name: '已删除用户', is_deleted: 1 },
  ];

  const mockPlatforms = [
    { id: 'platform-1', name: '平台A', is_deleted: 0 },
    { id: 'platform-2', name: '平台B', is_deleted: 0 },
    { id: 'platform-deleted', name: '已删除平台', is_deleted: 1 },
  ];

  const mockDepartments = [
    { id: 'dept-1', name: '技术部', is_deleted: 0 },
    { id: 'dept-2', name: '销售部', is_deleted: 0 },
    { id: 'dept-deleted', name: '已删除部门', is_deleted: 1 },
  ];

  const mockShops = [
    { id: 'shop-1', name: '店铺A', is_deleted: 0 },
    { id: 'shop-2', name: '店铺B', is_deleted: 0 },
    { id: 'shop-deleted', name: '已删除店铺', is_deleted: 1 },
  ];

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        IdConverterService,
        {
          provide: PrismaService,
          useValue: {
            sys_user: {
              findMany: jest.fn(),
            },
            biz_platform: {
              findMany: jest.fn(),
            },
            biz_department: {
              findMany: jest.fn(),
            },
            biz_shop: {
              findMany: jest.fn(),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            del: jest.fn(),
            deleteByPattern: jest.fn(),
          },
        },
      ],
    }).compile();

    service = module.get<IdConverterService>(IdConverterService);
    prisma = module.get<PrismaService>(PrismaService);
    redis = module.get<RedisService>(RedisService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('convertUserIds', () => {
    it('should return empty map for empty input', async () => {
      const result = await service.convertUserIds([]);
      expect(result.size).toBe(0);
    });

    it('should return empty map for null input', async () => {
      const result = await service.convertUserIds(null as any);
      expect(result.size).toBe(0);
    });

    it('should convert valid user IDs from database when cache miss', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.sys_user, 'findMany').mockResolvedValue([
        mockUsers[0],
        mockUsers[1],
      ] as any);

      const result = await service.convertUserIds(['user-1', 'user-2']);

      expect(result.size).toBe(2);
      expect(result.get('user-1')).toBe('张三');
      expect(result.get('user-2')).toBe('李四');
      expect(prisma.sys_user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1', 'user-2'] } },
        select: { id: true, name: true, is_deleted: true },
      });
    });

    it('should use cached values when available', async () => {
      jest.spyOn(redis, 'get')
        .mockResolvedValueOnce('张三')
        .mockResolvedValueOnce('李四');

      const result = await service.convertUserIds(['user-1', 'user-2']);

      expect(result.size).toBe(2);
      expect(result.get('user-1')).toBe('张三');
      expect(result.get('user-2')).toBe('李四');
      expect(prisma.sys_user.findMany).not.toHaveBeenCalled();
    });

    it('should handle deleted users with special format - Requirement 3.3', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.sys_user, 'findMany').mockResolvedValue([
        mockUsers[2],
      ] as any);

      const result = await service.convertUserIds(['user-deleted']);

      expect(result.size).toBe(1);
      expect(result.get('user-deleted')).toBe('已删除用户(原ID: user-deleted)');
    });

    it('should handle invalid user IDs with 未知用户 - Requirement 3.2', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.sys_user, 'findMany').mockResolvedValue([]);

      const result = await service.convertUserIds(['invalid-user']);

      expect(result.size).toBe(1);
      expect(result.get('invalid-user')).toBe('未知用户');
    });

    it('should deduplicate user IDs', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.sys_user, 'findMany').mockResolvedValue([
        mockUsers[0],
      ] as any);

      const result = await service.convertUserIds(['user-1', 'user-1', 'user-1']);

      expect(result.size).toBe(1);
      expect(prisma.sys_user.findMany).toHaveBeenCalledTimes(1);
      expect(prisma.sys_user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-1'] } },
        select: { id: true, name: true, is_deleted: true },
      });
    });

    it('should handle Redis cache failures gracefully', async () => {
      jest.spyOn(redis, 'get').mockRejectedValue(new Error('Redis error'));
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.sys_user, 'findMany').mockResolvedValue([
        mockUsers[0],
      ] as any);

      const result = await service.convertUserIds(['user-1']);

      expect(result.size).toBe(1);
      expect(result.get('user-1')).toBe('张三');
    });

    it('should handle database query failures gracefully', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(prisma.sys_user, 'findMany').mockRejectedValue(new Error('DB error'));

      const result = await service.convertUserIds(['user-1']);

      expect(result.size).toBe(1);
      expect(result.get('user-1')).toBe('未知用户');
    });

    it('should cache converted names with 1 hour TTL', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.sys_user, 'findMany').mockResolvedValue([
        mockUsers[0],
      ] as any);

      await service.convertUserIds(['user-1']);

      expect(redis.set).toHaveBeenCalledWith(
        'id-converter:user:user-1',
        '张三',
        3600,
      );
    });
  });

  describe('convertPlatformIds', () => {
    it('should return empty map for empty input', async () => {
      const result = await service.convertPlatformIds([]);
      expect(result.size).toBe(0);
    });

    it('should convert valid platform IDs from database', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.biz_platform, 'findMany').mockResolvedValue([
        mockPlatforms[0],
        mockPlatforms[1],
      ] as any);

      const result = await service.convertPlatformIds(['platform-1', 'platform-2']);

      expect(result.size).toBe(2);
      expect(result.get('platform-1')).toBe('平台A');
      expect(result.get('platform-2')).toBe('平台B');
    });

    it('should handle deleted platforms - Requirement 3.5', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.biz_platform, 'findMany').mockResolvedValue([
        mockPlatforms[2],
      ] as any);

      const result = await service.convertPlatformIds(['platform-deleted']);

      expect(result.size).toBe(1);
      expect(result.get('platform-deleted')).toBe('未知平台');
    });

    it('should handle invalid platform IDs - Requirement 3.5', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.biz_platform, 'findMany').mockResolvedValue([]);

      const result = await service.convertPlatformIds(['invalid-platform']);

      expect(result.size).toBe(1);
      expect(result.get('invalid-platform')).toBe('未知平台');
    });
  });

  describe('convertDepartmentIds', () => {
    it('should return empty map for empty input', async () => {
      const result = await service.convertDepartmentIds([]);
      expect(result.size).toBe(0);
    });

    it('should convert valid department IDs from database', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.biz_department, 'findMany').mockResolvedValue([
        mockDepartments[0],
        mockDepartments[1],
      ] as any);

      const result = await service.convertDepartmentIds(['dept-1', 'dept-2']);

      expect(result.size).toBe(2);
      expect(result.get('dept-1')).toBe('技术部');
      expect(result.get('dept-2')).toBe('销售部');
    });

    it('should handle deleted departments - Requirement 3.5', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.biz_department, 'findMany').mockResolvedValue([
        mockDepartments[2],
      ] as any);

      const result = await service.convertDepartmentIds(['dept-deleted']);

      expect(result.size).toBe(1);
      expect(result.get('dept-deleted')).toBe('未知部门');
    });

    it('should handle invalid department IDs - Requirement 3.5', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.biz_department, 'findMany').mockResolvedValue([]);

      const result = await service.convertDepartmentIds(['invalid-dept']);

      expect(result.size).toBe(1);
      expect(result.get('invalid-dept')).toBe('未知部门');
    });
  });

  describe('convertShopIds', () => {
    it('should return empty map for empty input', async () => {
      const result = await service.convertShopIds([]);
      expect(result.size).toBe(0);
    });

    it('should convert valid shop IDs from database', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.biz_shop, 'findMany').mockResolvedValue([
        mockShops[0],
        mockShops[1],
      ] as any);

      const result = await service.convertShopIds(['shop-1', 'shop-2']);

      expect(result.size).toBe(2);
      expect(result.get('shop-1')).toBe('店铺A');
      expect(result.get('shop-2')).toBe('店铺B');
    });

    it('should handle deleted shops - Requirement 3.5', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.biz_shop, 'findMany').mockResolvedValue([
        mockShops[2],
      ] as any);

      const result = await service.convertShopIds(['shop-deleted']);

      expect(result.size).toBe(1);
      expect(result.get('shop-deleted')).toBe('未知店铺');
    });

    it('should handle invalid shop IDs - Requirement 3.5', async () => {
      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.biz_shop, 'findMany').mockResolvedValue([]);

      const result = await service.convertShopIds(['invalid-shop']);

      expect(result.size).toBe(1);
      expect(result.get('invalid-shop')).toBe('未知店铺');
    });
  });

  describe('Cache eviction', () => {
    it('should evict user cache', async () => {
      jest.spyOn(redis, 'del').mockResolvedValue(1);

      await service.evictUserCache('user-1');

      expect(redis.del).toHaveBeenCalledWith('id-converter:user:user-1');
    });

    it('should evict platform cache', async () => {
      jest.spyOn(redis, 'del').mockResolvedValue(1);

      await service.evictPlatformCache('platform-1');

      expect(redis.del).toHaveBeenCalledWith('id-converter:platform:platform-1');
    });

    it('should evict department cache', async () => {
      jest.spyOn(redis, 'del').mockResolvedValue(1);

      await service.evictDepartmentCache('dept-1');

      expect(redis.del).toHaveBeenCalledWith('id-converter:department:dept-1');
    });

    it('should evict shop cache', async () => {
      jest.spyOn(redis, 'del').mockResolvedValue(1);

      await service.evictShopCache('shop-1');

      expect(redis.del).toHaveBeenCalledWith('id-converter:shop:shop-1');
    });

    it('should evict all cache', async () => {
      jest.spyOn(redis, 'deleteByPattern').mockResolvedValue(10);

      await service.evictAllCache();

      expect(redis.deleteByPattern).toHaveBeenCalledWith('id-converter:*');
    });

    it('should handle cache eviction failures gracefully', async () => {
      jest.spyOn(redis, 'del').mockRejectedValue(new Error('Redis error'));

      await expect(service.evictUserCache('user-1')).resolves.not.toThrow();
    });
  });

  describe('Batch conversion performance', () => {
    it('should handle large batch of user IDs efficiently', async () => {
      const largeUserIds = Array.from({ length: 100 }, (_, i) => `user-${i}`);
      const largeMockUsers = largeUserIds.map((id, i) => ({
        id,
        name: `用户${i}`,
        is_deleted: 0,
      }));

      jest.spyOn(redis, 'get').mockResolvedValue(null);
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.sys_user, 'findMany').mockResolvedValue(largeMockUsers as any);

      const startTime = Date.now();
      const result = await service.convertUserIds(largeUserIds);
      const endTime = Date.now();

      expect(result.size).toBe(100);
      expect(endTime - startTime).toBeLessThan(1000);
      expect(prisma.sys_user.findMany).toHaveBeenCalledTimes(1);
    });

    it('should handle mixed cache hits and misses', async () => {
      jest.spyOn(redis, 'get')
        .mockResolvedValueOnce('张三')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('王五');
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.sys_user, 'findMany').mockResolvedValue([
        mockUsers[1],
      ] as any);

      const result = await service.convertUserIds(['user-1', 'user-2', 'user-3']);

      expect(result.size).toBe(3);
      expect(result.get('user-1')).toBe('张三');
      expect(result.get('user-2')).toBe('李四');
      expect(result.get('user-3')).toBe('王五');
      expect(prisma.sys_user.findMany).toHaveBeenCalledWith({
        where: { id: { in: ['user-2'] } },
        select: { id: true, name: true, is_deleted: true },
      });
    });
  });

  describe('Cache hit rate testing', () => {
    it('should achieve high cache hit rate on repeated queries', async () => {
      jest.spyOn(redis, 'get')
        .mockResolvedValueOnce(null)
        .mockResolvedValueOnce('张三')
        .mockResolvedValueOnce('张三');
      jest.spyOn(redis, 'set').mockResolvedValue('OK');
      jest.spyOn(prisma.sys_user, 'findMany').mockResolvedValue([
        mockUsers[0],
      ] as any);

      await service.convertUserIds(['user-1']);
      await service.convertUserIds(['user-1']);
      await service.convertUserIds(['user-1']);

      expect(prisma.sys_user.findMany).toHaveBeenCalledTimes(1);
    });
  });
});
