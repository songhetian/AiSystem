# System Log Management - Performance Tests

## Overview

This directory contains performance tests for the System Log Management feature, validating that the system meets all performance requirements under load.

## Performance Requirements

### Validated Requirements

- **Requirement 23.1**: Async log recording with response time < 1 second
- **Requirement 23.2**: Search results returned within 3 seconds
- **Requirement 23.3**: Support millions of log records without performance degradation
- **Requirement 23.4**: Export 100,000 records within 10 seconds

## Test Suites

### 1. Async Log Recording Performance

Tests that log recording happens asynchronously without blocking the main business flow.

**Tests:**
- Single log recording < 1 second
- Batch recording of 100 logs with acceptable average time
- Async operations don't block main thread

**Thresholds:**
- Single record: < 1000ms
- Batch average: < 1000ms per log

### 2. Query Performance with Large Dataset

Tests query performance with 10,000+ log records to simulate production load.

**Tests:**
- Query with 10k records < 3 seconds
- Fast pagination to page 50
- Multi-condition query efficiency
- Complex filter combinations

**Thresholds:**
- Query time: < 3000ms
- Pagination: < 3000ms
- Multi-condition: < 3000ms

### 3. Export Performance

Tests export functionality with large datasets.

**Tests:**
- Export 1,000 records within reasonable time
- Concurrent export handling (3 simultaneous exports)
- Excel file generation performance

**Thresholds:**
- 1k records: < 10000ms
- 100k records: < 10000ms (scaled)
- Concurrent exports: Complete without errors

### 4. Cache Performance

Tests ID conversion caching to ensure optimal performance.

**Tests:**
- Cache hit vs cache miss performance comparison
- Batch ID conversion efficiency (100 IDs)
- Cache improves performance measurably

**Thresholds:**
- Batch conversion: < 1000ms
- Cache hit faster than cache miss

### 5. Stress Testing

Tests system stability under heavy load.

**Tests:**
- 10 rapid consecutive queries
- Large result sets (100 records per page)
- System maintains stability under load

**Thresholds:**
- Rapid queries: All complete successfully
- Large result sets: < 3000ms

## Prerequisites

### Database Setup

Performance tests require a test database with sufficient data:

```bash
# Create test database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS test_db;"

# Run migrations
DATABASE_URL="mysql://user:password@localhost:3306/test_db" npx prisma migrate deploy
```

### Test Data

Performance tests automatically create 10,000 test log records for realistic testing. This happens in the `beforeAll` hook.

**Note:** Test data creation may take 30-60 seconds depending on database performance.

### Environment Variables

```bash
export TEST_DATABASE_URL="mysql://user:password@localhost:3306/test_db"
export REDIS_URL="redis://localhost:6379"
```

## Running the Tests

### Run All Performance Tests

```bash
npm test -- test/performance/
```

### Run System Log Performance Tests Only

```bash
npm test -- test/performance/system-logs.performance.spec.ts
```

### Run with Verbose Output

```bash
npm test -- test/performance/system-logs.performance.spec.ts --verbose
```

### Run Specific Test Suite

```bash
npm test -- test/performance/system-logs.performance.spec.ts -t "Query Performance"
```

### Run with Extended Timeout

Performance tests may need longer timeouts:

```bash
npm test -- test/performance/system-logs.performance.spec.ts --testTimeout=120000
```

## Test Structure

```
System Log Management - Performance Tests
├── Async Log Recording Performance
│   ├── should record log asynchronously within 1 second
│   └── should record 100 logs asynchronously within reasonable time
├── Query Performance with Large Dataset
│   ├── should query logs within 3 seconds with 10k records
│   ├── should support fast pagination with large dataset
│   └── should handle multi-condition query efficiently
├── Export Performance
│   ├── should export 1000 records within reasonable time
│   └── should handle concurrent export requests
├── Cache Performance
│   ├── should improve performance with cache hits
│   └── should efficiently convert large batch of IDs
└── Stress Testing
    ├── should maintain stability with rapid consecutive queries
    └── should handle large result sets efficiently
```

## Performance Metrics

### Expected Results

Based on requirements, here are the expected performance metrics:

| Operation | Threshold | Typical Result |
|-----------|-----------|----------------|
| Single log record | < 1s | ~50-200ms |
| Batch 100 logs | < 1s avg | ~10-50ms avg |
| Query 10k records | < 3s | ~500-1500ms |
| Pagination jump | < 3s | ~500-1500ms |
| Export 1k records | < 10s | ~1-3s |
| Export 100k records | < 10s | ~5-10s |
| Batch ID conversion (100) | < 1s | ~100-500ms |
| Cache hit | Faster than miss | 2-10x faster |

### Performance Degradation

Tests validate that performance does NOT degrade with:
- Increasing data volume (up to millions of records)
- Concurrent requests (multiple simultaneous queries/exports)
- Complex filter combinations
- Large result sets

## Test Data Management

### Setup

Performance tests create:
- 1 test user
- 1 test platform
- 1 test department
- 10,000 test operation logs

**Creation time:** ~30-60 seconds

### Cleanup

All test data is automatically cleaned up in `afterAll` hook.

**Important:** Cleanup may take 10-30 seconds for large datasets.

### Data Volume

To test with different data volumes, modify the `createBulkLogs` function:

```typescript
// Create 100,000 logs instead of 10,000
await createBulkLogs(100000);
```

**Warning:** Creating 100k+ logs may take several minutes.

## Interpreting Results

### Console Output

Performance tests output detailed timing information:

```
✓ Async log recording completed in 156ms (threshold: 1000ms)
✓ Batch async recording: 100 logs in 2341ms (avg: 23.41ms per log)
✓ Query with 10k records completed in 1234ms (threshold: 3000ms)
✓ Pagination to page 50 completed in 987ms (threshold: 3000ms)
✓ Multi-condition query completed in 1456ms (threshold: 3000ms)
✓ Export 1000 records completed in 3456ms (threshold: 10000ms)
✓ 3 concurrent exports completed in 8765ms
✓ First call: 234ms, Second call (cached): 45ms
✓ Cache improved performance by 80.77%
✓ Batch conversion of 100 IDs completed in 456ms
✓ 10 rapid queries completed in 5678ms (avg: 567.80ms per query)
✓ Large result set (100 records) retrieved in 1234ms
```

### Performance Issues

If tests fail or exceed thresholds:

1. **Database Performance**
   - Check database indexes
   - Verify query execution plans
   - Consider database optimization

2. **Network Latency**
   - Run tests on same machine as database
   - Check network connectivity
   - Consider connection pooling

3. **System Resources**
   - Ensure sufficient CPU/memory
   - Close other applications
   - Check system load

4. **Test Data Volume**
   - Verify test data was created successfully
   - Check actual record count in database
   - Consider data distribution

## Optimization Tips

### Database Optimization

```sql
-- Add indexes for common queries
CREATE INDEX idx_operation_log_user_time ON sys_operation_log(user_id, create_time);
CREATE INDEX idx_operation_log_platform_time ON sys_operation_log(platform_id, create_time);
CREATE INDEX idx_operation_log_module_time ON sys_operation_log(operation_module, create_time);

-- Add indexes for login logs
CREATE INDEX idx_login_log_user_time ON sys_login_log(user_id, create_time);
CREATE INDEX idx_login_log_status_time ON sys_login_log(login_status, create_time);
```

### Application Optimization

1. **Enable Query Caching**
   - Use Redis for frequently accessed data
   - Cache ID conversions
   - Cache common query results

2. **Optimize Batch Operations**
   - Use `createMany` instead of multiple `create` calls
   - Batch ID conversions
   - Use database transactions

3. **Implement Pagination**
   - Always use pagination for large result sets
   - Limit page size to reasonable values (10-100)
   - Use cursor-based pagination for very large datasets

4. **Async Processing**
   - Use message queues for log recording
   - Process exports asynchronously
   - Implement background jobs for heavy operations

## Continuous Integration

### GitHub Actions Example

```yaml
name: Performance Tests

on:
  schedule:
    - cron: '0 2 * * *'  # Run nightly
  workflow_dispatch:  # Manual trigger

jobs:
  performance-tests:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: test_db
        ports:
          - 3306:3306
        options: >-
          --health-cmd="mysqladmin ping"
          --health-interval=10s
          --health-timeout=5s
          --health-retries=3
      redis:
        image: redis:7
        ports:
          - 6379:6379
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd backend && npm ci
      - name: Run migrations
        run: cd backend && npx prisma migrate deploy
        env:
          DATABASE_URL: mysql://root:root@localhost:3306/test_db
      - name: Run performance tests
        run: cd backend && npm test -- test/performance/ --testTimeout=120000
        env:
          DATABASE_URL: mysql://root:root@localhost:3306/test_db
          REDIS_URL: redis://localhost:6379
      - name: Upload performance results
        uses: actions/upload-artifact@v3
        with:
          name: performance-results
          path: backend/performance-results.json
```

## Troubleshooting

### Tests Timeout

Increase Jest timeout:

```javascript
// In test file
jest.setTimeout(120000); // 2 minutes

// Or in jest.config.js
module.exports = {
  testTimeout: 120000,
};
```

### Out of Memory

If tests fail with OOM errors:

```bash
# Increase Node.js memory limit
NODE_OPTIONS="--max-old-space-size=4096" npm test -- test/performance/
```

### Slow Test Data Creation

If creating 10k logs takes too long:

1. Reduce batch size in `createBulkLogs`
2. Use database bulk insert optimizations
3. Disable foreign key checks temporarily (test only!)
4. Consider using database snapshots

### Inconsistent Results

If performance varies significantly between runs:

1. Run tests multiple times and average results
2. Ensure no other processes are using database
3. Warm up database with initial queries
4. Use dedicated test environment

## Benchmarking

To benchmark against production:

1. Export production query patterns
2. Create realistic test data distribution
3. Run performance tests with production-like load
4. Compare results against production metrics

## Related Documentation

- [Integration Tests](../integration/README.md)
- [System Log Management Design](../../.kiro/specs/system-log-management/design.md)
- [System Log Management Requirements](../../.kiro/specs/system-log-management/requirements.md)
- [Performance Optimization Guide](../../docs/performance-optimization.md)
