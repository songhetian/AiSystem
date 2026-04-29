# LogCacheService - 日志系统故障恢复机制

## 概述

LogCacheService 是系统日志管理系统的故障恢复组件,确保在数据库连接失败时日志不会丢失,满足 Requirements 19.1, 19.2, 19.3 的要求。

## 核心功能

### 1. 数据库连接健康检查 (Requirement 19.1)

- **自动检测**: 每30秒自动检查数据库连接状态
- **健康状态追踪**: 维护数据库连接健康状态标志
- **恢复触发**: 数据库恢复后自动触发缓存日志同步

```typescript
// 检查数据库健康状态
const isHealthy = await logCacheService.checkDatabaseHealth();

// 定期健康检查 (每30秒自动执行)
@Cron(CronExpression.EVERY_30_SECONDS)
async periodicHealthCheck(): Promise<void>
```

### 2. 本地缓存机制 (Requirement 19.1)

#### 双层缓存策略

1. **文件系统缓存** (主要)
   - 使用 JSONL 格式存储日志
   - 缓存目录: `log-cache/`
   - 登录日志: `log-cache/login-logs.jsonl`
   - 操作日志: `log-cache/operation-logs.jsonl`

2. **内存队列缓存** (备份)
   - 当文件系统失败时使用
   - 最大队列大小: 10,000 条
   - 防止磁盘故障导致日志丢失

#### 缓存接口

```typescript
// 缓存登录日志
await logCacheService.cacheLoginLog({
  user_id: 'user-123',
  username: 'testuser',
  login_ip: '192.168.1.1',
  login_status: 1,
  // ... 其他字段
});

// 缓存操作日志
await logCacheService.cacheOperationLog({
  user_id: 'user-123',
  username: 'testuser',
  request_method: 'POST',
  api_path: '/api/users',
  operation_status: 1,
  // ... 其他字段
});
```

### 3. 自动同步机制 (Requirements 19.2, 19.3)

#### 同步触发条件

1. **数据库恢复时**: 健康检查检测到数据库恢复后自动触发
2. **手动触发**: 管理员可手动触发同步
3. **服务启动时**: 服务初始化时尝试同步历史缓存

#### 同步流程

1. 检查数据库健康状态
2. 同步内存队列中的日志
3. 同步文件系统中的日志
4. 失败的日志保留在缓存中,等待下次重试
5. 成功同步的日志从缓存中删除

```typescript
// 自动同步 (数据库恢复后自动调用)
await logCacheService.syncCachedLogs();

// 手动同步
await logCacheService.forceSyncCachedLogs();
```

### 4. 零丢失保证 (Requirement 19.3)

#### 保证机制

1. **双层缓存**: 文件系统 + 内存队列
2. **原子操作**: 使用 JSONL 格式,每行独立
3. **失败重试**: 同步失败的日志保留,等待下次重试
4. **并发安全**: 防止并发同步导致数据不一致
5. **部分成功处理**: 部分日志同步失败不影响已成功的日志

## 使用示例

### 在 AuditLogService 中集成

```typescript
@Injectable()
export class AuditLogService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly logCacheService: LogCacheService,
  ) {}

  async logLogin(payload: LoginLogPayload) {
    try {
      // 尝试直接写入数据库
      await this.prisma.sys_login_log.create({ data: payload });
    } catch (error) {
      // 数据库失败时缓存到本地
      await this.logCacheService.cacheLoginLog(payload);
    }
  }

  async logOperation(payload: OperationLogPayload) {
    try {
      // 尝试直接写入数据库
      await this.prisma.sys_operation_log.create({ data: payload });
    } catch (error) {
      // 数据库失败时缓存到本地
      await this.logCacheService.cacheOperationLog(payload);
    }
  }
}
```

### 监控缓存状态

```typescript
// 获取缓存统计信息
const stats = await logCacheService.getCacheStats();

console.log('Database Healthy:', stats.isDatabaseHealthy);
console.log('Last Health Check:', stats.lastHealthCheck);
console.log('Memory Queue Size:', stats.memoryQueueSize);
console.log('File System Cache Size:', stats.fileSystemCacheSize);
```

## 测试覆盖

### 测试场景

1. **数据库连接健康检查**
   - 检测健康的数据库连接
   - 检测数据库连接失败
   - 数据库恢复后触发同步

2. **本地缓存写入**
   - 缓存登录日志到文件系统
   - 缓存操作日志到文件系统
   - 缓存多条日志

3. **数据库恢复后同步**
   - 同步登录日志到数据库
   - 同步操作日志到数据库
   - 同步失败时保留缓存
   - 部分同步成功处理

4. **零丢失保证**
   - 数据库断连时日志不丢失
   - 文件系统失败时使用内存队列
   - 并发写入场景
   - 大量日志缓存和同步

5. **缓存统计**
   - 获取缓存统计信息

6. **手动同步**
   - 手动触发同步

### 运行测试

```bash
cd backend
npm test -- log-cache.service.spec.ts
```

## 性能考虑

1. **异步操作**: 所有缓存和同步操作都是异步的,不阻塞主业务
2. **批量处理**: 同步时批量处理缓存日志,提高效率
3. **内存限制**: 内存队列限制为 10,000 条,防止内存溢出
4. **文件格式**: 使用 JSONL 格式,支持增量写入和读取

## 故障场景处理

### 场景 1: 数据库完全断连

1. 日志写入失败
2. 自动缓存到文件系统
3. 定期健康检查检测数据库状态
4. 数据库恢复后自动同步缓存日志

### 场景 2: 文件系统故障

1. 文件写入失败
2. 自动切换到内存队列
3. 文件系统恢复后继续使用文件缓存
4. 内存队列中的日志在数据库恢复后同步

### 场景 3: 部分同步失败

1. 同步过程中某些日志写入失败
2. 失败的日志保留在缓存中
3. 已成功的日志从缓存中删除
4. 下次同步时重试失败的日志

### 场景 4: 服务重启

1. 服务启动时自动初始化缓存目录
2. 检查是否有历史缓存日志
3. 如果数据库健康,自动同步历史缓存
4. 确保重启不会导致日志丢失

## 配置

### 缓存目录

默认缓存目录: `<project_root>/log-cache/`

可以通过修改 `LogCacheService` 中的 `CACHE_DIR` 常量来更改:

```typescript
private readonly CACHE_DIR = path.join(process.cwd(), 'log-cache');
```

### 健康检查间隔

默认每 30 秒检查一次数据库健康状态。

可以通过修改 `@Cron` 装饰器来更改:

```typescript
@Cron(CronExpression.EVERY_30_SECONDS)
async periodicHealthCheck(): Promise<void>
```

### 内存队列大小

默认最大 10,000 条日志。

可以通过修改 `MAX_QUEUE_SIZE` 常量来更改:

```typescript
private readonly MAX_QUEUE_SIZE = 10000;
```

## 监控和告警

建议在生产环境中监控以下指标:

1. **缓存日志数量**: 如果持续增长,说明数据库长时间不可用
2. **同步失败次数**: 如果频繁失败,需要检查数据库和网络
3. **内存队列使用率**: 如果接近上限,需要增加队列大小或优化同步频率
4. **文件系统使用率**: 防止缓存文件占用过多磁盘空间

## 注意事项

1. **磁盘空间**: 确保有足够的磁盘空间存储缓存日志
2. **文件权限**: 确保应用有权限在缓存目录创建和写入文件
3. **并发控制**: 服务内部已实现并发控制,防止重复同步
4. **数据一致性**: 缓存日志的时间戳是缓存时的时间,不是原始操作时间

## 未来改进

1. **压缩存储**: 对历史缓存文件进行压缩,节省磁盘空间
2. **分布式缓存**: 支持多实例部署时的缓存共享
3. **优先级队列**: 支持不同优先级的日志,优先同步重要日志
4. **告警集成**: 集成告警系统,缓存日志超过阈值时发送告警
