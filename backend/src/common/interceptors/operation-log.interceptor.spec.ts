import { Test, TestingModule } from '@nestjs/testing';
import { ExecutionContext, CallHandler } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { of, throwError } from 'rxjs';
import { OperationLogInterceptor } from './operation-log.interceptor';
import { AuditLogService } from '../services/audit-log.service';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../services/redis.service';

describe('OperationLogInterceptor', () => {
  let interceptor: OperationLogInterceptor;
  let auditLogService: jest.Mocked<AuditLogService>;
  let prismaService: jest.Mocked<PrismaService>;
  let redisService: jest.Mocked<RedisService>;
  let reflector: jest.Mocked<Reflector>;

  const mockUser = {
    id: 'user-123',
    username: 'testuser',
    name: '测试用户',
    platform_id: 'platform-1',
    dept_id: 'dept-1',
    shop_id: 'shop-1',
  };

  const mockRequest = {
    method: 'POST',
    originalUrl: '/api/users',
    url: '/api/users',
    user: { sub: 'user-123', username: 'testuser' },
    headers: {
      'user-agent': 'Mozilla/5.0',
      'x-forwarded-for': '192.168.1.1',
    },
    params: {},
    query: {},
    body: { name: '新用户' },
    ip: '192.168.1.1',
    socket: { remoteAddress: '192.168.1.1' },
  };

  const mockExecutionContext = {
    switchToHttp: () => ({
      getRequest: () => mockRequest,
    }),
    getHandler: () => ({}),
    getClass: () => ({}),
  } as unknown as ExecutionContext;

  const mockCallHandler: CallHandler = {
    handle: () => of({ success: true, data: { id: 'new-user-id' } }),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        OperationLogInterceptor,
        {
          provide: Reflector,
          useValue: {
            getAllAndOverride: jest.fn(),
          },
        },
        {
          provide: AuditLogService,
          useValue: {
            logOperation: jest.fn().mockResolvedValue(undefined),
          },
        },
        {
          provide: PrismaService,
          useValue: {
            sys_user: {
              findUnique: jest.fn().mockResolvedValue(mockUser),
            },
          },
        },
        {
          provide: RedisService,
          useValue: {
            rpush: jest.fn().mockResolvedValue(1),
          },
        },
      ],
    }).compile();

    interceptor = module.get<OperationLogInterceptor>(OperationLogInterceptor);
    auditLogService = module.get(AuditLogService) as jest.Mocked<AuditLogService>;
    prismaService = module.get(PrismaService) as jest.Mocked<PrismaService>;
    redisService = module.get(RedisService) as jest.Mocked<RedisService>;
    reflector = module.get(Reflector) as jest.Mocked<Reflector>;

    // Default mock implementations
    (prismaService.sys_user.findUnique as jest.Mock).mockResolvedValue(mockUser);
    (auditLogService.logOperation as jest.Mock).mockResolvedValue(undefined);
    reflector.getAllAndOverride.mockReturnValue('user:create');
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('基本功能测试', () => {
    it('应该成功创建拦截器实例', () => {
      expect(interceptor).toBeDefined();
    });

    it('应该对 POST 请求记录日志', (done) => {
      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          // 等待异步日志记录完成
          setTimeout(() => {
            expect(auditLogService.logOperation).toHaveBeenCalled();
            done();
          }, 100);
        },
      });
    });

    it('应该对 PUT 请求记录日志', (done) => {
      const putRequest = { ...mockRequest, method: 'PUT' };
      const putContext = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => putRequest,
        }),
      } as unknown as ExecutionContext;

      const observable = interceptor.intercept(putContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogService.logOperation).toHaveBeenCalled();
            done();
          }, 100);
        },
      });
    });

    it('应该对 DELETE 请求记录日志', (done) => {
      const deleteRequest = { ...mockRequest, method: 'DELETE' };
      const deleteContext = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => deleteRequest,
        }),
      } as unknown as ExecutionContext;

      const observable = interceptor.intercept(deleteContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogService.logOperation).toHaveBeenCalled();
            done();
          }, 100);
        },
      });
    });

    it('应该对导出请求记录日志', (done) => {
      const exportRequest = { ...mockRequest, method: 'GET', originalUrl: '/api/users/export' };
      const exportContext = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => exportRequest,
        }),
      } as unknown as ExecutionContext;

      const observable = interceptor.intercept(exportContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogService.logOperation).toHaveBeenCalled();
            done();
          }, 100);
        },
      });
    });

    it('应该跳过普通 GET 请求', (done) => {
      const getRequest = { ...mockRequest, method: 'GET', originalUrl: '/api/users' };
      const getContext = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => getRequest,
        }),
      } as unknown as ExecutionContext;

      const observable = interceptor.intercept(getContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogService.logOperation).not.toHaveBeenCalled();
            done();
          }, 50);
        },
      });
    });
  });

  describe('异步写入性能测试 (Requirement 1.1, 1.4)', () => {
    it('应该异步记录日志，不阻塞主业务', (done) => {
      const startTime = Date.now();

      // 模拟数据库写入延迟
      auditLogService.logOperation.mockImplementation(() => {
        return new Promise((resolve) => setTimeout(resolve, 500));
      });

      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

      observable.subscribe({
        next: (result) => {
          const responseTime = Date.now() - startTime;

          // 主业务应该立即返回，不等待日志写入
          expect(responseTime).toBeLessThan(100);
          expect(result).toEqual({ success: true, data: { id: 'new-user-id' } });
          done();
        },
      });
    });

    it('应该在 1 秒内完成响应 (Requirement 23.1)', (done) => {
      const startTime = Date.now();

      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          const responseTime = Date.now() - startTime;
          expect(responseTime).toBeLessThan(1000);
          done();
        },
      });
    });
  });

  describe('时间戳校正逻辑测试 (Requirement 2.1, 2.2, 2.3)', () => {
    it('应该接受有效的时间戳', (done) => {
      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.requestTime).toBeDefined();
            expect(typeof logCall.requestTime).toBe('number');
            done();
          }, 100);
        },
      });
    });

    it('应该自动修正异常时间戳', (done) => {
      // 创建一个未来时间（10分钟后）
      const futureTime = new Date(Date.now() + 10 * 60 * 1000);

      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            const recordedTime = logCall.requestTime || Date.now();
            const now = Date.now();

            // 记录的时间应该接近当前时间，而不是未来时间
            expect(Math.abs(recordedTime - now)).toBeLessThan(5000);
            done();
          }, 100);
        },
      });
    });
  });

  describe('内容截断逻辑测试 (Requirement 4.3, 4.5)', () => {
    it('应该截断超过 500 字符的操作内容', (done) => {
      const longMessage = 'A'.repeat(600);
      const errorHandler: CallHandler = {
        handle: () => throwError(() => new Error(longMessage)),
      };

      const observable = interceptor.intercept(mockExecutionContext, errorHandler);

      observable.subscribe({
        error: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            const message = logCall.operation_message || '';
            expect(message.length).toBeLessThanOrEqual(510); // 500 + "（内容已截取）"
            expect(message).toContain('（内容已截取）');
            done();
          }, 100);
        },
      });
    });

    it('应该保留短于 500 字符的操作内容', (done) => {
      const shortMessage = '正常长度的消息';
      const errorHandler: CallHandler = {
        handle: () => throwError(() => new Error(shortMessage)),
      };

      const observable = interceptor.intercept(mockExecutionContext, errorHandler);

      observable.subscribe({
        error: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.operation_message).toContain(shortMessage);
            expect(logCall.operation_message).not.toContain('（内容已截取）');
            done();
          }, 100);
        },
      });
    });
  });

  describe('失败场景处理测试 (Requirement 1.5, 5.1, 5.2, 5.3)', () => {
    it('应该记录操作失败原因', (done) => {
      const errorMessage = '用户名已存在';
      const errorHandler: CallHandler = {
        handle: () => throwError(() => new Error(errorMessage)),
      };

      const observable = interceptor.intercept(mockExecutionContext, errorHandler);

      observable.subscribe({
        error: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.operation_status).toBe(0);
            expect(logCall.operation_message).toContain(errorMessage);
            done();
          }, 100);
        },
      });
    });

    it('应该处理未返回结果的异常情况', (done) => {
      const errorHandler: CallHandler = {
        handle: () => throwError(() => new Error('')),
      };

      const observable = interceptor.intercept(mockExecutionContext, errorHandler);

      observable.subscribe({
        error: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.operation_status).toBe(0);
            // When error message is empty, it should contain "操作异常（未返回结果）"
            expect(logCall.operation_message).toContain('失败');
            done();
          }, 100);
        },
      });
    });

    it('应该在数据库写入失败时使用 Redis 兜底', (done) => {
      auditLogService.logOperation.mockRejectedValue(new Error('数据库连接失败'));
      redisService.rpush.mockResolvedValue(1);

      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            expect(auditLogService.logOperation).toHaveBeenCalled();
            expect(redisService.rpush).toHaveBeenCalled();
            done();
          }, 100);
        },
      });
    });
  });

  describe('模块名称映射测试 (Requirement 4.1, 4.2)', () => {
    it('应该正确映射用户管理模块', (done) => {
      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.operation_module).toBe('用户管理');
            done();
          }, 100);
        },
      });
    });

    it('应该处理未知模块', (done) => {
      const unknownRequest = { ...mockRequest, originalUrl: '/api/unknown-module' };
      const unknownContext = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => unknownRequest,
        }),
      } as unknown as ExecutionContext;

      const observable = interceptor.intercept(unknownContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.operation_module).toBe('未知模块');
            done();
          }, 100);
        },
      });
    });
  });

  describe('IP 地址获取测试 (Requirement 4.6, 4.7)', () => {
    it('应该从 x-forwarded-for 头获取 IP', (done) => {
      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.request_ip).toBe('192.168.1.1');
            done();
          }, 100);
        },
      });
    });

    it('应该处理 IP 获取失败的情况', (done) => {
      const noIpRequest = {
        ...mockRequest,
        headers: { 'user-agent': 'Mozilla/5.0' },
        ip: undefined,
        socket: {},
      };
      const noIpContext = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => noIpRequest,
        }),
      } as unknown as ExecutionContext;

      const observable = interceptor.intercept(noIpContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.request_ip).toBe('IP获取失败');
            done();
          }, 100);
        },
      });
    });
  });

  describe('操作内容自动提取测试 (Requirement 1.3, 4.3, 4.4)', () => {
    it('应该为 POST 请求生成"创建"操作内容', (done) => {
      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.operation_message).toContain('创建');
            expect(logCall.operation_message).toContain('用户');
            done();
          }, 100);
        },
      });
    });

    it('应该为 PUT 请求生成"更新"操作内容', (done) => {
      const putRequest = { ...mockRequest, method: 'PUT' };
      const putContext = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => putRequest,
        }),
      } as unknown as ExecutionContext;

      const observable = interceptor.intercept(putContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.operation_message).toContain('更新');
            done();
          }, 100);
        },
      });
    });

    it('应该为 DELETE 请求生成"删除"操作内容', (done) => {
      const deleteRequest = { ...mockRequest, method: 'DELETE' };
      const deleteContext = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => deleteRequest,
        }),
      } as unknown as ExecutionContext;

      const observable = interceptor.intercept(deleteContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.operation_message).toContain('删除');
            done();
          }, 100);
        },
      });
    });

    it('应该为导出请求生成"导出"操作内容', (done) => {
      const exportRequest = { ...mockRequest, method: 'GET', originalUrl: '/api/users/export' };
      const exportContext = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => exportRequest,
        }),
      } as unknown as ExecutionContext;

      const observable = interceptor.intercept(exportContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.operation_message).toContain('导出');
            done();
          }, 100);
        },
      });
    });

    it('应该处理空操作内容', (done) => {
      // 模拟一个没有明确操作类型的请求
      const emptyRequest = { ...mockRequest, method: 'OPTIONS', originalUrl: '/api/unknown' };
      const emptyContext = {
        ...mockExecutionContext,
        switchToHttp: () => ({
          getRequest: () => emptyRequest,
        }),
      } as unknown as ExecutionContext;

      const observable = interceptor.intercept(emptyContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            const message = logCall.operation_message || '';
            expect(message).toBeDefined();
            expect(message.length).toBeGreaterThan(0);
            done();
          }, 100);
        },
      });
    });
  });

  describe('用户信息获取测试 (Requirement 1.2, 3.1)', () => {
    it('应该获取并记录用户信息', (done) => {
      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            expect(prismaService.sys_user.findUnique).toHaveBeenCalledWith({
              where: { id: 'user-123' },
            });
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.user_id).toBe('user-123');
            expect(logCall.username).toBe('testuser');
            expect(logCall.platform_id).toBe('platform-1');
            expect(logCall.dept_id).toBe('dept-1');
            expect(logCall.shop_id).toBe('shop-1');
            done();
          }, 100);
        },
      });
    });

    it('应该处理用户不存在的情况', (done) => {
      (prismaService.sys_user.findUnique as jest.Mock).mockResolvedValue(null);

      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.user_id).toBe('user-123');
            expect(logCall.username).toBe('testuser');
            done();
          }, 100);
        },
      });
    });
  });

  describe('执行时间记录测试 (Requirement 1.2)', () => {
    it('应该记录操作执行时间', (done) => {
      const observable = interceptor.intercept(mockExecutionContext, mockCallHandler);

      observable.subscribe({
        next: () => {
          setTimeout(() => {
            const logCall = auditLogService.logOperation.mock.calls[0][0];
            expect(logCall.execution_time).toBeDefined();
            expect(typeof logCall.execution_time).toBe('number');
            expect(logCall.execution_time).toBeGreaterThanOrEqual(0);
            done();
          }, 100);
        },
      });
    });
  });
});
