# System Log Management - Integration Tests

## Overview

This directory contains integration tests for the System Log Management feature, validating complete end-to-end workflows including:

- **Operation Log Flow**: Record → Query → Export
- **Login Log Flow**: Record → Query → Export
- **Permission Control**: Role-based access control and data immutability
- **Exception Handling**: Invalid IDs, empty results, time range corrections
- **ID Conversion**: Batch conversion of user/platform/department/shop IDs

## Test Coverage

### Requirements Validated

- **Requirement 1.1**: Auto-record CRUD operations
- **Requirement 6.1**: Auto-record login attempts
- **Requirement 12.1-12.2**: Data immutability (no delete/edit)
- **Requirement 13.1**: Multi-condition search
- **Requirement 14.2-14.3**: Exception handling (time range, empty results)
- **Requirement 17.1**: Export functionality
- **Requirement 20.1-20.2**: Permission control (super admin vs regular admin)
- **Requirement 3.1-3.2**: ID conversion and invalid ID handling

## Prerequisites

### Database Setup

The tests require a test database with the following models:
- `sys_user` - User accounts
- `sys_operation_log` - Operation logs
- `sys_login_log` - Login logs
- `biz_platform` - Business platforms
- `biz_department` - Departments
- `biz_shop` - Shops

### Environment Variables

```bash
# Set test database URL
export TEST_DATABASE_URL="mysql://user:password@localhost:3306/test_db"

# Or use .env.test file
DATABASE_URL="mysql://user:password@localhost:3306/test_db"
REDIS_URL="redis://localhost:6379"
```

### Dependencies

Ensure all dependencies are installed:

```bash
cd backend
npm install
```

## Running the Tests

### Run All Integration Tests

```bash
npm test -- test/integration/
```

### Run System Log Integration Tests Only

```bash
npm test -- test/integration/system-logs.integration.spec.ts
```

### Run with Coverage

```bash
npm test -- test/integration/system-logs.integration.spec.ts --coverage
```

### Run Specific Test Suite

```bash
npm test -- test/integration/system-logs.integration.spec.ts -t "Complete Operation Log Flow"
```

### Run in Watch Mode

```bash
npm test -- test/integration/system-logs.integration.spec.ts --watch
```

## Test Structure

```
System Log Management - Integration Tests
├── Complete Operation Log Flow
│   ├── should record operation log automatically
│   ├── should query operation logs with ID to name conversion
│   └── should export operation logs to Excel
├── Complete Login Log Flow
│   ├── should record login log automatically
│   ├── should query login logs with ID to name conversion
│   └── should export login logs to Excel
├── Permission Control Integration
│   ├── should allow super admin to query all logs
│   ├── should restrict regular admin to their department/platform logs
│   ├── should reject delete operation on logs
│   └── should reject update operation on logs
├── Exception Handling Scenarios
│   ├── should handle invalid user ID gracefully
│   ├── should handle empty search results
│   ├── should auto-correct invalid time range
│   └── should handle large export request with warning
└── ID Converter Service Integration
    ├── should convert user IDs in batch
    ├── should convert platform IDs in batch
    ├── should convert department IDs in batch
    └── should convert shop IDs in batch
```

## Test Data Management

### Setup

Test data is automatically created in `beforeAll` hook:
- Test user: `integration-test-user`
- Test platform: `集成测试平台`
- Test department: `集成测试部门`
- Test shop: `集成测试店铺`

### Cleanup

Test data is automatically cleaned up in `afterAll` hook to ensure test isolation.

### Isolation

- Each test suite uses unique identifiers
- Tests do not depend on each other
- Can be run in parallel with proper database isolation

## Known Issues

### Import Path Issues

If you encounter module resolution errors, ensure:

1. Prisma client is generated:
   ```bash
   npx prisma generate
   ```

2. TypeScript paths are configured correctly in `tsconfig.json`

3. All service files exist at expected locations:
   - `src/prisma/prisma.service.ts`
   - `src/modules/system/services/system-logs.service.ts`
   - `src/modules/system/services/id-converter.service.ts`

### Database Connection Errors

If tests fail with database connection errors:

1. Ensure MySQL/PostgreSQL is running
2. Verify `TEST_DATABASE_URL` environment variable
3. Run migrations on test database:
   ```bash
   DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
   ```

### Redis Connection Errors

If tests fail with Redis errors:

1. Ensure Redis is running: `redis-server`
2. Verify `REDIS_URL` environment variable
3. Tests mock Redis by default, so this should not be an issue

## Continuous Integration

### GitHub Actions Example

```yaml
name: Integration Tests

on: [push, pull_request]

jobs:
  integration-tests:
    runs-on: ubuntu-latest
    services:
      mysql:
        image: mysql:8.0
        env:
          MYSQL_ROOT_PASSWORD: root
          MYSQL_DATABASE: test_db
        ports:
          - 3306:3306
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
      - name: Run integration tests
        run: cd backend && npm test -- test/integration/
        env:
          DATABASE_URL: mysql://root:root@localhost:3306/test_db
          REDIS_URL: redis://localhost:6379
```

## Troubleshooting

### Test Timeout

If tests timeout, increase the Jest timeout:

```bash
npm test -- test/integration/system-logs.integration.spec.ts --testTimeout=60000
```

Or set in `jest.config.js`:

```javascript
module.exports = {
  testTimeout: 60000,
  // ... other config
};
```

### Database Cleanup Issues

If test data is not cleaned up properly:

```bash
# Manually clean test data
mysql -u root -p test_db -e "DELETE FROM sys_operation_log WHERE platform_id LIKE 'test-%';"
mysql -u root -p test_db -e "DELETE FROM sys_login_log WHERE platform_id LIKE 'test-%';"
```

### Module Not Found Errors

If you see "Cannot find module" errors:

1. Check that all imports use correct relative paths
2. Verify Prisma client is generated
3. Rebuild the project: `npm run build`

## Contributing

When adding new integration tests:

1. Follow existing test structure and naming conventions
2. Use descriptive test names that explain what is being tested
3. Include requirement validation comments (e.g., `**Validates: Requirement X.X**`)
4. Ensure proper test data setup and cleanup
5. Make tests isolated and repeatable
6. Update this README with new test information

## Related Documentation

- [Performance Tests](../performance/README.md)
- [System Log Management Design](../../.kiro/specs/system-log-management/design.md)
- [System Log Management Requirements](../../.kiro/specs/system-log-management/requirements.md)
- [System Log Management Tasks](../../.kiro/specs/system-log-management/tasks.md)
