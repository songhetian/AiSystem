import { Test, TestingModule } from "@nestjs/testing";
import { LogAlertService, LogAlertType, AlertLevel } from "./log-alert.service";
import { PrismaService } from "../../../prisma/prisma.service";
import { SystemMessagesService } from "./system-messages.service";

describe("LogAlertService", () => {
  let service: LogAlertService;
  let prismaService: PrismaService;
  let messagesService: SystemMessagesService;

  const mockPrismaService = {
    sys_log_alert: {
      create: jest.fn(),
    },
    sys_role: {
      findMany: jest.fn(),
    },
    sys_user_role: {
      findMany: jest.fn(),
    },
    sys_user: {
      findMany: jest.fn(),
    },
  };

  const mockMessagesService = {
    sendFromTemplate: jest.fn(),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        LogAlertService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
        {
          provide: SystemMessagesService,
          useValue: mockMessagesService,
        },
      ],
    }).compile();

    service = module.get<LogAlertService>(LogAlertService);
    prismaService = module.get<PrismaService>(PrismaService);
    messagesService = module.get<SystemMessagesService>(SystemMessagesService);

    // Reset all mocks before each test
    jest.clearAllMocks();
  });

  it("should be defined", () => {
    expect(service).toBeDefined();
  });

  describe("triggerAlert", () => {
    it("should persist alert to database", async () => {
      // Arrange
      const alertData = {
        type: LogAlertType.LOG_RECORDING_ERROR,
        level: AlertLevel.ERROR,
        title: "日志记录异常",
        message: "操作日志记录失败",
        details: { errorMessage: "Database connection failed" },
        userId: "user-123",
        platformId: "platform-123",
      };

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
        ...alertData,
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([
        { id: "role-1" },
        { id: "role-2" },
      ]);

      mockPrismaService.sys_user_role.findMany.mockResolvedValue([
        { user_id: "admin-1" },
        { user_id: "admin-2" },
      ]);

      mockPrismaService.sys_user.findMany.mockResolvedValue([
        { id: "admin-1", username: "admin1" },
        { id: "admin-2", username: "admin2" },
      ]);

      mockMessagesService.sendFromTemplate.mockResolvedValue({
        id: "message-123",
      });

      // Act
      await service.triggerAlert(alertData);

      // Assert
      expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledWith({
        data: {
          alert_type: alertData.type,
          alert_level: alertData.level,
          alert_title: alertData.title,
          alert_message: alertData.message,
          alert_details: JSON.stringify(alertData.details),
          user_id: alertData.userId,
          platform_id: alertData.platformId,
          dept_id: null,
          is_resolved: 0,
        },
      });
    });

    it("should send notifications to admin users", async () => {
      // Arrange
      const alertData = {
        type: LogAlertType.LOG_QUERY_ERROR,
        level: AlertLevel.ERROR,
        title: "日志查询异常",
        message: "操作日志查询失败",
      };

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([
        { id: "role-1" },
      ]);

      mockPrismaService.sys_user_role.findMany.mockResolvedValue([
        { user_id: "admin-1" },
      ]);

      mockPrismaService.sys_user.findMany.mockResolvedValue([
        { id: "admin-1", username: "admin1" },
      ]);

      mockMessagesService.sendFromTemplate.mockResolvedValue({
        id: "message-123",
      });

      // Act
      await service.triggerAlert(alertData);

      // Assert
      expect(mockMessagesService.sendFromTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          templateName: "系统告警通知",
          recipientId: "admin-1",
          senderId: "SYSTEM",
          variables: expect.objectContaining({
            alertTitle: alertData.title,
            alertMessage: alertData.message,
            alertLevel: "错误",
          }),
        }),
      );
    });

    it("should deduplicate alerts within 1 hour window", async () => {
      // Arrange
      const alertData = {
        type: LogAlertType.INVALID_ID_WARNING,
        level: AlertLevel.WARNING,
        title: "无效ID告警",
        message: "检测到无效的用户ID: user-999",
        details: { invalidId: "user-999" },
      };

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user.findMany.mockResolvedValue([]);

      // Act - First trigger
      await service.triggerAlert(alertData);

      // Assert - First trigger should persist
      expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledTimes(1);

      // Act - Second trigger (should be deduplicated)
      await service.triggerAlert(alertData);

      // Assert - Second trigger should be deduplicated
      expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledTimes(1);
    });

    it("should not throw error if persistence fails", async () => {
      // Arrange
      const alertData = {
        type: LogAlertType.LOG_EXPORT_ERROR,
        level: AlertLevel.ERROR,
        title: "日志导出异常",
        message: "操作日志导出失败",
      };

      mockPrismaService.sys_log_alert.create.mockRejectedValue(
        new Error("Database error"),
      );

      mockPrismaService.sys_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user.findMany.mockResolvedValue([]);

      // Act & Assert - Should not throw
      await expect(service.triggerAlert(alertData)).resolves.not.toThrow();
    });

    it("should not throw error if notification fails", async () => {
      // Arrange
      const alertData = {
        type: LogAlertType.UNKNOWN_MODULE_WARNING,
        level: AlertLevel.WARNING,
        title: "未知模块告警",
        message: "检测到未知的操作模块: unknown_module",
      };

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([
        { id: "role-1" },
      ]);

      mockPrismaService.sys_user_role.findMany.mockResolvedValue([
        { user_id: "admin-1" },
      ]);

      mockPrismaService.sys_user.findMany.mockResolvedValue([
        { id: "admin-1", username: "admin1" },
      ]);

      mockMessagesService.sendFromTemplate.mockRejectedValue(
        new Error("Notification error"),
      );

      // Act & Assert - Should not throw
      await expect(service.triggerAlert(alertData)).resolves.not.toThrow();
    });
  });

  describe("alertLogRecordingError", () => {
    it("should trigger alert with correct parameters", async () => {
      // Arrange
      const error = new Error("Database connection failed");
      const context = {
        logType: "operation" as const,
        userId: "user-123",
        platformId: "platform-123",
        deptId: "dept-123",
      };

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user.findMany.mockResolvedValue([]);

      // Act
      await service.alertLogRecordingError(error, context);

      // Assert
      expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: LogAlertType.LOG_RECORDING_ERROR,
            alert_level: AlertLevel.ERROR,
            alert_title: "日志记录异常",
            alert_message: "操作日志记录失败",
            user_id: context.userId,
            platform_id: context.platformId,
            dept_id: context.deptId,
          }),
        }),
      );
    });
  });

  describe("alertLogQueryError", () => {
    it("should trigger alert with correct parameters", async () => {
      // Arrange
      const error = new Error("Query timeout");
      const context = {
        logType: "login" as const,
        userId: "user-123",
        query: { page: 1, pageSize: 20 },
      };

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user.findMany.mockResolvedValue([]);

      // Act
      await service.alertLogQueryError(error, context);

      // Assert
      expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: LogAlertType.LOG_QUERY_ERROR,
            alert_level: AlertLevel.ERROR,
            alert_title: "日志查询异常",
            alert_message: "登录日志查询失败",
            user_id: context.userId,
          }),
        }),
      );
    });
  });

  describe("alertLogExportError", () => {
    it("should trigger alert with correct parameters", async () => {
      // Arrange
      const error = new Error("Export failed");
      const context = {
        logType: "operation" as const,
        userId: "user-123",
        exportCount: 1000,
      };

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user.findMany.mockResolvedValue([]);

      // Act
      await service.alertLogExportError(error, context);

      // Assert
      expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: LogAlertType.LOG_EXPORT_ERROR,
            alert_level: AlertLevel.ERROR,
            alert_title: "日志导出异常",
            alert_message: "操作日志导出失败",
            user_id: context.userId,
          }),
        }),
      );
    });
  });

  describe("alertInvalidId", () => {
    it("should trigger alert with correct parameters", async () => {
      // Arrange
      const context = {
        idType: "user" as const,
        invalidId: "user-999",
        logType: "operation" as const,
        logId: "log-123",
      };

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user.findMany.mockResolvedValue([]);

      // Act
      await service.alertInvalidId(context);

      // Assert
      expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: LogAlertType.INVALID_ID_WARNING,
            alert_level: AlertLevel.WARNING,
            alert_title: "无效ID告警",
            alert_message: "检测到无效的用户ID: user-999",
          }),
        }),
      );
    });

    it("should handle different ID types correctly", async () => {
      // Arrange
      const testCases = [
        { idType: "platform" as const, invalidId: "platform-999", expectedMessage: "检测到无效的平台ID: platform-999" },
        { idType: "department" as const, invalidId: "department-999", expectedMessage: "检测到无效的部门ID: department-999" },
        { idType: "shop" as const, invalidId: "shop-999", expectedMessage: "检测到无效的店铺ID: shop-999" },
      ];

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user.findMany.mockResolvedValue([]);

      // Act & Assert
      for (const testCase of testCases) {
        jest.clearAllMocks(); // Clear mocks between iterations

        await service.alertInvalidId({
          idType: testCase.idType,
          invalidId: testCase.invalidId,
        });

        expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledWith(
          expect.objectContaining({
            data: expect.objectContaining({
              alert_message: testCase.expectedMessage,
            }),
          }),
        );
      }
    });
  });

  describe("alertUnknownModule", () => {
    it("should trigger alert with correct parameters", async () => {
      // Arrange
      const context = {
        moduleName: "unknown_module",
        apiPath: "/api/unknown",
        userId: "user-123",
      };

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user.findMany.mockResolvedValue([]);

      // Act
      await service.alertUnknownModule(context);

      // Assert
      expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: LogAlertType.UNKNOWN_MODULE_WARNING,
            alert_level: AlertLevel.WARNING,
            alert_title: "未知模块告警",
            alert_message: "检测到未知的操作模块: unknown_module",
            user_id: context.userId,
          }),
        }),
      );
    });
  });

  describe("alertOperationResultMissing", () => {
    it("should trigger alert with correct parameters", async () => {
      // Arrange
      const context = {
        apiPath: "/api/operation",
        userId: "user-123",
        platformId: "platform-123",
      };

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user.findMany.mockResolvedValue([]);

      // Act
      await service.alertOperationResultMissing(context);

      // Assert
      expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: LogAlertType.OPERATION_RESULT_MISSING,
            alert_level: AlertLevel.WARNING,
            alert_title: "操作结果未返回",
            alert_message: "操作异常（未返回结果）: /api/operation",
            user_id: context.userId,
            platform_id: context.platformId,
          }),
        }),
      );
    });
  });

  describe("alertTimestampAbnormal", () => {
    it("should trigger alert with correct parameters", async () => {
      // Arrange
      const originalTimestamp = new Date("2020-01-01");
      const correctedTimestamp = new Date();
      const context = {
        logType: "operation" as const,
        originalTimestamp,
        correctedTimestamp,
        userId: "user-123",
      };

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user.findMany.mockResolvedValue([]);

      // Act
      await service.alertTimestampAbnormal(context);

      // Assert
      expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: LogAlertType.TIMESTAMP_ABNORMAL,
            alert_level: AlertLevel.INFO,
            alert_title: "时间戳异常",
            alert_message: "操作日志时间戳异常，已自动修正",
            user_id: context.userId,
          }),
        }),
      );
    });
  });

  describe("alertDatabaseConnectionFailed", () => {
    it("should trigger alert with correct parameters", async () => {
      // Arrange
      const error = new Error("Connection refused");

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user.findMany.mockResolvedValue([]);

      // Act
      await service.alertDatabaseConnectionFailed(error);

      // Assert
      expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            alert_type: LogAlertType.DATABASE_CONNECTION_FAILED,
            alert_level: AlertLevel.CRITICAL,
            alert_title: "数据库连接失败",
            alert_message: "日志系统数据库连接失败，日志已缓存到本地",
          }),
        }),
      );
    });
  });

  describe("cleanupExpiredCache", () => {
    it("should remove expired cache entries", async () => {
      // Arrange
      const alertData = {
        type: LogAlertType.INVALID_ID_WARNING,
        level: AlertLevel.WARNING,
        title: "无效ID告警",
        message: "检测到无效的用户ID: user-999",
        details: { invalidId: "user-999" },
      };

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockPrismaService.sys_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user_role.findMany.mockResolvedValue([]);
      mockPrismaService.sys_user.findMany.mockResolvedValue([]);

      // Act - Trigger alert to populate cache
      await service.triggerAlert(alertData);

      // Mock time passing (more than 1 hour)
      jest.spyOn(Date, "now").mockReturnValue(Date.now() + 3600001);

      // Act - Cleanup expired cache
      service.cleanupExpiredCache();

      // Reset time mock
      jest.spyOn(Date, "now").mockRestore();

      // Act - Trigger same alert again (should not be deduplicated after cleanup)
      await service.triggerAlert(alertData);

      // Assert - Should persist twice (once before cleanup, once after)
      expect(mockPrismaService.sys_log_alert.create).toHaveBeenCalledTimes(2);
    });
  });

  describe("getAlertRecipients", () => {
    it("should return super_admin and auditor users", async () => {
      // Arrange
      mockPrismaService.sys_role.findMany.mockResolvedValue([
        { id: "role-super-admin" },
        { id: "role-auditor" },
      ]);

      mockPrismaService.sys_user_role.findMany.mockResolvedValue([
        { user_id: "admin-1" },
        { user_id: "admin-2" },
        { user_id: "auditor-1" },
      ]);

      mockPrismaService.sys_user.findMany.mockResolvedValue([
        { id: "admin-1", username: "admin1" },
        { id: "admin-2", username: "admin2" },
        { id: "auditor-1", username: "auditor1" },
      ]);

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockMessagesService.sendFromTemplate.mockResolvedValue({
        id: "message-123",
      });

      const alertData = {
        type: LogAlertType.LOG_RECORDING_ERROR,
        level: AlertLevel.ERROR,
        title: "日志记录异常",
        message: "操作日志记录失败",
      };

      // Act
      await service.triggerAlert(alertData);

      // Assert
      expect(mockMessagesService.sendFromTemplate).toHaveBeenCalledTimes(3);
    });

    it("should only notify enabled users", async () => {
      // Arrange
      mockPrismaService.sys_role.findMany.mockResolvedValue([
        { id: "role-super-admin" },
      ]);

      mockPrismaService.sys_user_role.findMany.mockResolvedValue([
        { user_id: "admin-1" },
        { user_id: "admin-2" },
      ]);

      // Only admin-1 is enabled (status: 1)
      mockPrismaService.sys_user.findMany.mockResolvedValue([
        { id: "admin-1", username: "admin1" },
      ]);

      mockPrismaService.sys_log_alert.create.mockResolvedValue({
        id: "alert-123",
      });

      mockMessagesService.sendFromTemplate.mockResolvedValue({
        id: "message-123",
      });

      const alertData = {
        type: LogAlertType.LOG_RECORDING_ERROR,
        level: AlertLevel.ERROR,
        title: "日志记录异常",
        message: "操作日志记录失败",
      };

      // Act
      await service.triggerAlert(alertData);

      // Assert - Should only send to enabled user
      expect(mockMessagesService.sendFromTemplate).toHaveBeenCalledTimes(1);
      expect(mockMessagesService.sendFromTemplate).toHaveBeenCalledWith(
        expect.objectContaining({
          recipientId: "admin-1",
        }),
      );
    });
  });
});
