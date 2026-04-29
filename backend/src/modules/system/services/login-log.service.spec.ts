import { Test, TestingModule } from '@nestjs/testing';
import { LoginLogService } from './login-log.service';
import { PrismaService } from '../../../prisma/prisma.service';
import { RedisService } from '../../../common/services/redis.service';
import { MessageService } from '../../../common/services/message.service';
import { ConfigCacheService } from '../../../common/services/config-cache.service';

describe('LoginLogService', () => {
  let service: LoginLogService;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;

  beforeEach(async () => {
    const mockCreate = jest.fn();
    const mockFindMany = jest.fn();

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LoginLogService,
        {
          provide: PrismaService,
          useValue: {
            sys_login_log: { create: mockCreate },
            sys_user: { findMany: mockFindMany },
          },
        },
        {
          provide: RedisService,
          useValue: {
            get: jest.fn(),
            set: jest.fn(),
            incr: jest.fn(),
            expire: jest.fn(),
            del: jest.fn(),
            lpush: jest.fn(),
            rpop: jest.fn(),
          },
        },
        {
          provide: MessageService,
          useValue: { send: jest.fn() },
        },
        {
          provide: ConfigCacheService,
          useValue: { getNumber: jest.fn() },
        },
      ],
    }).compile();

    service = module.get<LoginLogService>(LoginLogService);
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  /**
   * **Validates: Requirements 9.1, 9.2, 9.3, 9.4**
   * 测试设备信息解析
   */
  describe('parseUserAgent', () => {
    it('should parse Chrome on Windows correctly', () => {
      const ua = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36';
      const result = service.parseUserAgent(ua);

      expect(result.browser).toBe('Chrome');
      expect(result.os).toBe('Windows');
      expect(result.deviceType).toBe('pc');
    });

    it('should handle null user agent', () => {
      const result = service.parseUserAgent(null);
      expect(result.browser).toBe('未知浏览器');
      expect(result.os).toBe('未知系统');
    });
  });

  /**
   * **Validates: Requirements 10.1, 10.2, 10.3**
   * 测试IP地址处理
   */
  describe('getClientIp', () => {
    it('should return valid IP', () => {
      expect(service.getClientIp('192.168.1.1')).toBe('192.168.1.1');
    });

    it('should handle localhost', () => {
      expect(service.getClientIp('127.0.0.1')).toBe('IP获取失败');
    });
  });

  /**
   * **Validates: Requirements 11.1, 11.2, 11.3**
   * 测试连续失败检测和账号锁定
   */
  describe('login failure detection', () => {
    it('should track login failures', async () => {
      redisService.incr.mockResolvedValue(3);
      const count = await service.recordLoginFailure('testuser');
      expect(count).toBe(3);
      expect(redisService.expire).toHaveBeenCalledWith('login:failure:testuser', 3600);
    });

    it('should lock account after threshold', async () => {
      (prismaService.sys_login_log.create as jest.Mock).mockResolvedValue({});
      redisService.rpop.mockResolvedValue(null);

      await service.lockAccount('testuser', 900);

      expect(redisService.set).toHaveBeenCalledWith('login:lock:testuser', '1', 900);
      expect(prismaService.sys_login_log.create).toHaveBeenCalled();
    });

    it('should check if account is locked', async () => {
      redisService.get.mockResolvedValue('1');
      const isLocked = await service.isAccountLocked('testuser');
      expect(isLocked).toBe(true);
    });
  });

  /**
   * **Validates: Requirements 7.1, 7.2, 7.3**
   * 测试时间戳校正
   */
  describe('validateAndCorrectTimestamp', () => {
    it('should use current time for null timestamp', () => {
      const result = service.validateAndCorrectTimestamp(null);
      expect(result.corrected).toBe(true);
      expect(result.timestamp).toBeInstanceOf(Date);
    });

    it('should use current time for invalid timestamp', () => {
      const result = service.validateAndCorrectTimestamp(new Date('invalid'));
      expect(result.corrected).toBe(true);
    });

    it('should accept valid future timestamp', () => {
      const future = new Date(Date.now() + 1000);
      const result = service.validateAndCorrectTimestamp(future);
      expect(result.corrected).toBe(false);
    });
  });
});
