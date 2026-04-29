import { Test, TestingModule } from '@nestjs/testing';
import { PartitionService } from './partition.service';
import { PrismaService } from '../../../prisma/prisma.service';

describe('PartitionService', () => {
  let service: PartitionService;
  let prismaService: jest.Mocked<PrismaService>;

  beforeEach(async () => {
    const mockPrismaService = {
      $queryRawUnsafe: jest.fn(),
      $executeRawUnsafe: jest.fn(),
      sys_operation_log: { findMany: jest.fn() },
      sys_login_log: { findMany: jest.fn() },
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        PartitionService,
        { provide: PrismaService, useValue: mockPrismaService },
      ],
    }).compile();

    service = module.get<PartitionService>(PartitionService);
    prismaService = module.get(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  describe('getPartitionTableName', () => {
    it('should generate correct partition table name', () => {
      const date = new Date('2024-01-15');
      const tableName = service.getPartitionTableName('sys_operation_log', date);
      expect(tableName).toBe('sys_operation_log_202401');
    });
  });

  describe('checkTableExists', () => {
    it('should return true when table exists', async () => {
      prismaService.$queryRawUnsafe.mockResolvedValue([{ Tables_in_db: 'test' }]);
      const exists = await service.checkTableExists('test');
      expect(exists).toBe(true);
    });
  });
});
