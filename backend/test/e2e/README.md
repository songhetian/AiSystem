# Quality Prompt Integration - End-to-End Tests

This directory contains comprehensive end-to-end tests for the Quality Inspection Prompt Integration feature.

## Test Coverage

### Backend Integration Tests
**File:** `backend/src/modules/service/services/quality-prompt.integration.spec.ts`

Tests the complete backend service layer including:
- ✅ Global Prompt CRUD operations
- ✅ Department Prompt CRUD operations
- ✅ Conflict validation logic
- ✅ Version management functionality
- ✅ Permission control enforcement
- ✅ Batch operations
- ✅ Cache invalidation

**Requirements Validated:** 1.1-1.6, 2.1-2.8, 3.1-3.8, 4.1-4.8, 5.1-5.6, 6.1-6.7, 9.1-9.7, 22.1-22.6

### Frontend Component Tests
**Files:**
- `frontend/src/pages/service/quality-prompts/components/__tests__/VersionHistory.test.tsx`
- `frontend/src/pages/service/quality-prompts/components/__tests__/PromptPreview.test.tsx`
- `frontend/src/pages/service/quality-prompts/global/__tests__/GlobalPromptList.test.tsx`

Tests frontend components including:
- ✅ Version history display and rollback
- ✅ Prompt preview functionality
- ✅ Global prompt list with search and pagination
- ✅ CRUD operations UI
- ✅ Keyboard shortcuts
- ✅ Form validation

**Requirements Validated:** 3.1-3.8, 6.1-6.7, 10.1-10.7, 12.1-12.5, 14.1-14.6

### End-to-End Workflow Tests
**File:** `backend/test/e2e/quality-prompt-workflows.e2e.spec.ts`

Tests complete user workflows including:
- ✅ Complete prompt creation flow (global → department → audit)
- ✅ Conflict detection and resolution flow
- ✅ Version rollback flow
- ✅ Batch operations flow
- ✅ Quality inspection integration

**Requirements Validated:** All requirements (1.1-25.6)

## Running the Tests

### Prerequisites

1. **Backend Tests:**
   ```bash
   cd backend
   npm install
   ```

2. **Frontend Tests (requires additional setup):**
   ```bash
   cd frontend
   npm install --save-dev @testing-library/react @testing-library/jest-dom @testing-library/user-event jest jest-environment-jsdom @types/jest
   ```

### Backend Integration Tests

Run all backend integration tests:
```bash
cd backend
npm test -- quality-prompt.integration.spec.ts
```

Run specific test suite:
```bash
npm test -- quality-prompt.integration.spec.ts -t "Global Prompt CRUD Operations"
```

Run with coverage:
```bash
npm test -- quality-prompt.integration.spec.ts --coverage
```

### Frontend Component Tests

**Note:** Frontend testing setup is not yet complete. To run frontend tests, you need to:

1. Add Jest configuration to `frontend/package.json`:
```json
{
  "scripts": {
    "test": "jest",
    "test:watch": "jest --watch",
    "test:coverage": "jest --coverage"
  },
  "jest": {
    "preset": "ts-jest",
    "testEnvironment": "jsdom",
    "setupFilesAfterEnv": ["<rootDir>/src/setupTests.ts"],
    "moduleNameMapper": {
      "^@/(.*)$": "<rootDir>/src/$1"
    }
  }
}
```

2. Create `frontend/src/setupTests.ts`:
```typescript
import '@testing-library/jest-dom';
```

3. Run tests:
```bash
cd frontend
npm test
```

### End-to-End Tests

**Important:** E2E tests require a test database and should be run in isolation.

1. Set up test database:
```bash
# Create test database
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS test_db;"

# Set test database URL
export TEST_DATABASE_URL="mysql://user:password@localhost:3306/test_db"
```

2. Run migrations on test database:
```bash
cd backend
DATABASE_URL=$TEST_DATABASE_URL npx prisma migrate deploy
```

3. Run E2E tests:
```bash
npm test -- quality-prompt-workflows.e2e.spec.ts
```

Run specific workflow:
```bash
npm test -- quality-prompt-workflows.e2e.spec.ts -t "Complete Prompt Creation Flow"
```

### Run All Tests

Backend only:
```bash
cd backend
npm test
```

Frontend only (after setup):
```bash
cd frontend
npm test
```

## Test Structure

### Backend Integration Tests

```
describe('QualityPromptService - Integration Tests')
  ├── Global Prompt CRUD Operations
  │   ├── createGlobalPrompt
  │   ├── updateGlobalPrompt
  │   ├── deleteGlobalPrompt
  │   ├── toggleGlobalPromptStatus
  │   └── queryGlobalPrompts
  ├── Department Prompt CRUD Operations
  │   ├── createDepartmentPrompt
  │   ├── updateDepartmentPrompt
  │   └── deleteDepartmentPrompt
  ├── Conflict Validation
  ├── Version Management
  ├── Permission Control
  ├── Batch Operations
  └── Cache Invalidation
```

### Frontend Component Tests

```
describe('VersionHistory Component')
  ├── Version List Display
  ├── Version Comparison
  ├── Version Rollback
  ├── Department Prompt Support
  ├── Modal Behavior
  └── Pagination

describe('PromptPreview Component')
  ├── Preview Dialog Display
  ├── Test Conversation Input
  ├── Quality Inspection Execution
  ├── Re-run Preview
  └── Results Not Persisted

describe('GlobalPromptList Component')
  ├── List Display
  ├── Search Functionality
  ├── Create Prompt
  ├── Edit Prompt
  ├── Delete Prompt
  ├── Enable/Disable Prompt
  ├── Pagination
  └── Keyboard Shortcuts
```

### End-to-End Workflow Tests

```
describe('Quality Prompt Workflows (E2E)')
  ├── Complete Prompt Creation Flow
  │   ├── Create global → department → verify audit
  │   ├── Validate required fields
  │   └── Enforce permission control
  ├── Conflict Detection and Resolution Flow
  │   ├── Detect conflicts
  │   ├── Allow compatible prompts
  │   └── Super admin override
  ├── Version Rollback Flow
  │   ├── Update and create versions
  │   ├── Rollback to previous version
  │   └── Retrieve version history with diff
  ├── Batch Operations Flow
  │   ├── Batch enable/disable
  │   ├── Export to Excel
  │   ├── Import from Excel
  │   └── Handle partial failures
  └── Quality Inspection Integration
      ├── Execute with merged prompts
      └── Cache and invalidate
```

## Test Data Management

### Setup
- Test data is created in `beforeEach` or `beforeAll` hooks
- Uses isolated test platform ID: `test-platform-e2e`
- Uses isolated test department ID: `test-dept-e2e`

### Cleanup
- Test data is cleaned up in `afterEach` or `afterAll` hooks
- Redis cache is cleared before each test
- Database records are deleted after test suite completes

### Isolation
- Each test suite uses unique identifiers
- Tests do not depend on each other
- Can be run in parallel (with proper database isolation)

## Continuous Integration

### GitHub Actions Example

```yaml
name: Quality Prompt Tests

on: [push, pull_request]

jobs:
  backend-tests:
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
      - name: Run tests
        run: cd backend && npm test
        env:
          DATABASE_URL: mysql://root:root@localhost:3306/test_db
          REDIS_URL: redis://localhost:6379

  frontend-tests:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '18'
      - name: Install dependencies
        run: cd frontend && npm ci
      - name: Run tests
        run: cd frontend && npm test
```

## Troubleshooting

### Common Issues

1. **Database connection errors:**
   - Ensure MySQL is running
   - Check DATABASE_URL environment variable
   - Verify test database exists

2. **Redis connection errors:**
   - Ensure Redis is running
   - Check REDIS_URL environment variable
   - Default: `redis://localhost:6379`

3. **Frontend test setup:**
   - Install required testing libraries
   - Configure Jest properly
   - Mock API calls correctly

4. **E2E test timeouts:**
   - Increase Jest timeout: `jest.setTimeout(30000)`
   - Check database performance
   - Verify network connectivity

### Debug Mode

Run tests with verbose output:
```bash
npm test -- --verbose
```

Run single test file:
```bash
npm test -- quality-prompt.integration.spec.ts
```

Run with debugger:
```bash
node --inspect-brk node_modules/.bin/jest --runInBand
```

## Coverage Reports

Generate coverage report:
```bash
npm test -- --coverage
```

View coverage in browser:
```bash
open coverage/lcov-report/index.html
```

## Contributing

When adding new tests:
1. Follow existing test structure
2. Use descriptive test names
3. Include requirement validation comments
4. Clean up test data properly
5. Ensure tests are isolated and repeatable
6. Update this README with new test information

## Requirements Traceability

All tests include requirement validation comments in the format:
```typescript
/**
 * Test Suite Name
 * **Validates: Requirements X.X-Y.Y**
 */
```

This ensures full traceability from requirements to test coverage.
