/**
 * Bug Condition Exploration Test for Default Login Credentials Documentation Inconsistency
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 *
 * This test explores the bug condition where users cannot successfully login using
 * the default credentials shown in documentation because they are inconsistent with
 * the actual seed data.
 *
 * IMPORTANT: This test is EXPECTED TO FAIL on unfixed documentation.
 * When it fails, it proves the bug exists and provides counterexamples.
 * When the documentation is fixed, this test should pass.
 */

const fs = require('fs');
const path = require('path');

// Test configuration
const TEST_CONFIG = {
  // Actual password from seed data (backend/prisma/seed.ts)
  ACTUAL_ADMIN_PASSWORD: 'Admin123456',

  // Expected behavior: all documentation should show consistent credentials
  EXPECTED_ADMIN_USERNAME: 'admin',
  EXPECTED_ADMIN_PASSWORD: 'Admin123456',

  // Files to check for documentation consistency
  DOCUMENTATION_FILES: [
    '使用手册.md',
    'README.md',
    '部署.md',
    'frontend/src/pages/login/index.tsx'
  ]
};

/**
 * Property 1: Bug Condition - Default Credentials Documentation Inconsistency
 *
 * For any new deployment system user viewing documentation to get default credentials,
 * the fixed documentation system should display consistent correct default credentials
 * (username: admin, password: Admin123456) in all locations, enabling successful login.
 */
function testBugCondition() {
  console.log('🔍 Testing Bug Condition: Default Credentials Documentation Inconsistency');
  console.log('================================================================================');

  const results = {
    passed: true,
    counterexamples: [],
    summary: {
      totalChecks: 0,
      failedChecks: 0,
      inconsistencies: []
    }
  };

  // Test Case 1: User Manual Test Account Table Consistency
  console.log('\n📋 Test Case 1: User Manual Test Account Table');
  console.log('Checking: 使用手册.md test account table shows correct admin password');

  try {
    const userManualPath = '使用手册.md';
    if (!fs.existsSync(userManualPath)) {
      throw new Error(`File not found: ${userManualPath}`);
    }

    const userManualContent = fs.readFileSync(userManualPath, 'utf8');
    results.summary.totalChecks++;

    // Look for test account table
    const tableMatch = userManualContent.match(/\|\s*用户名\s*\|\s*密码\s*\|\s*角色\s*\|[\s\S]*?\|\s*admin\s*\|\s*([^|]+)\s*\|\s*管理员\s*\|/);

    if (tableMatch) {
      const documentedPassword = tableMatch[1].trim();
      console.log(`  Found documented admin password: "${documentedPassword}"`);
      console.log(`  Expected admin password: "${TEST_CONFIG.EXPECTED_ADMIN_PASSWORD}"`);

      if (documentedPassword !== TEST_CONFIG.EXPECTED_ADMIN_PASSWORD) {
        results.passed = false;
        results.summary.failedChecks++;
        const counterexample = {
          file: userManualPath,
          issue: 'Password mismatch in test account table',
          documented: documentedPassword,
          expected: TEST_CONFIG.EXPECTED_ADMIN_PASSWORD,
          location: 'Test account table'
        };
        results.counterexamples.push(counterexample);
        results.summary.inconsistencies.push(`使用手册显示admin密码为"${documentedPassword}"，但种子数据中为"${TEST_CONFIG.EXPECTED_ADMIN_PASSWORD}"`);
        console.log(`  ❌ INCONSISTENCY: Password mismatch - documented: "${documentedPassword}", actual: "${TEST_CONFIG.EXPECTED_ADMIN_PASSWORD}"`);
      } else {
        console.log(`  ✅ Password matches expected value`);
      }
    } else {
      results.passed = false;
      results.summary.failedChecks++;
      const counterexample = {
        file: userManualPath,
        issue: 'Test account table not found or malformed',
        documented: 'N/A',
        expected: 'Table with admin credentials',
        location: 'Test account section'
      };
      results.counterexamples.push(counterexample);
      results.summary.inconsistencies.push('使用手册中未找到测试账号表格');
      console.log(`  ❌ MISSING: Test account table not found`);
    }
  } catch (error) {
    results.passed = false;
    results.summary.failedChecks++;
    console.log(`  ❌ ERROR: ${error.message}`);
  }

  // Test Case 2: README Quick Login Information
  console.log('\n📖 Test Case 2: README Quick Login Information');
  console.log('Checking: README.md contains default login credentials');

  try {
    const readmePath = 'README.md';
    if (!fs.existsSync(readmePath)) {
      throw new Error(`File not found: ${readmePath}`);
    }

    const readmeContent = fs.readFileSync(readmePath, 'utf8');
    results.summary.totalChecks++;

    // Check for default login information
    const hasDefaultCredentials = readmeContent.includes('admin') &&
                                 readmeContent.includes(TEST_CONFIG.EXPECTED_ADMIN_PASSWORD);

    console.log(`  Searching for default credentials in README...`);
    console.log(`  Contains 'admin': ${readmeContent.includes('admin')}`);
    console.log(`  Contains '${TEST_CONFIG.EXPECTED_ADMIN_PASSWORD}': ${readmeContent.includes(TEST_CONFIG.EXPECTED_ADMIN_PASSWORD)}`);

    if (!hasDefaultCredentials) {
      results.passed = false;
      results.summary.failedChecks++;
      const counterexample = {
        file: readmePath,
        issue: 'Missing default login credentials',
        documented: 'No default credentials found',
        expected: `Username: ${TEST_CONFIG.EXPECTED_ADMIN_USERNAME}, Password: ${TEST_CONFIG.EXPECTED_ADMIN_PASSWORD}`,
        location: 'Quick start or access section'
      };
      results.counterexamples.push(counterexample);
      results.summary.inconsistencies.push('README缺少快速登录信息');
      console.log(`  ❌ MISSING: Default login credentials not found in README`);
    } else {
      console.log(`  ✅ Default credentials found in README`);
    }
  } catch (error) {
    results.passed = false;
    results.summary.failedChecks++;
    console.log(`  ❌ ERROR: ${error.message}`);
  }

  // Test Case 3: Deployment Documentation Default Credentials
  console.log('\n🚀 Test Case 3: Deployment Documentation');
  console.log('Checking: 部署.md contains default credentials in deployment sections');

  try {
    const deploymentPath = '部署.md';
    if (!fs.existsSync(deploymentPath)) {
      throw new Error(`File not found: ${deploymentPath}`);
    }

    const deploymentContent = fs.readFileSync(deploymentPath, 'utf8');
    results.summary.totalChecks++;

    // Check for default credentials in deployment sections
    const hasDefaultCredentials = deploymentContent.includes('admin') &&
                                 deploymentContent.includes(TEST_CONFIG.EXPECTED_ADMIN_PASSWORD);

    console.log(`  Searching for default credentials in deployment docs...`);
    console.log(`  Contains 'admin': ${deploymentContent.includes('admin')}`);
    console.log(`  Contains '${TEST_CONFIG.EXPECTED_ADMIN_PASSWORD}': ${deploymentContent.includes(TEST_CONFIG.EXPECTED_ADMIN_PASSWORD)}`);

    if (!hasDefaultCredentials) {
      results.passed = false;
      results.summary.failedChecks++;
      const counterexample = {
        file: deploymentPath,
        issue: 'Missing default credentials in deployment documentation',
        documented: 'No default credentials found',
        expected: `Default login section with admin/${TEST_CONFIG.EXPECTED_ADMIN_PASSWORD}`,
        location: 'First startup or quick start section'
      };
      results.counterexamples.push(counterexample);
      results.summary.inconsistencies.push('部署文档缺少默认凭据说明');
      console.log(`  ❌ MISSING: Default credentials not found in deployment documentation`);
    } else {
      console.log(`  ✅ Default credentials found in deployment documentation`);
    }
  } catch (error) {
    results.passed = false;
    results.summary.failedChecks++;
    console.log(`  ❌ ERROR: ${error.message}`);
  }

  // Test Case 4: Login Page Default Credential Hints
  console.log('\n🔐 Test Case 4: Login Page Default Credential Hints');
  console.log('Checking: Login page provides default credential hints');

  try {
    const loginPagePath = 'frontend/src/pages/login/index.tsx';
    if (!fs.existsSync(loginPagePath)) {
      throw new Error(`File not found: ${loginPagePath}`);
    }

    const loginPageContent = fs.readFileSync(loginPagePath, 'utf8');
    results.summary.totalChecks++;

    // Check for default credential hints in login page
    const hasCredentialHints = loginPageContent.includes('默认') ||
                              loginPageContent.includes('admin') ||
                              loginPageContent.includes(TEST_CONFIG.EXPECTED_ADMIN_PASSWORD) ||
                              loginPageContent.includes('测试账号') ||
                              loginPageContent.includes('开发环境');

    console.log(`  Searching for credential hints in login page...`);
    console.log(`  Contains credential hints: ${hasCredentialHints}`);

    if (!hasCredentialHints) {
      results.passed = false;
      results.summary.failedChecks++;
      const counterexample = {
        file: loginPagePath,
        issue: 'Missing default credential hints on login page',
        documented: 'No credential hints found',
        expected: 'Development environment credential hints',
        location: 'Login form area'
      };
      results.counterexamples.push(counterexample);
      results.summary.inconsistencies.push('登录页面缺少默认凭据提示');
      console.log(`  ❌ MISSING: No default credential hints found on login page`);
    } else {
      console.log(`  ✅ Credential hints found on login page`);
    }
  } catch (error) {
    results.passed = false;
    results.summary.failedChecks++;
    console.log(`  ❌ ERROR: ${error.message}`);
  }

  // Test Results Summary
  console.log('\n📊 Test Results Summary');
  console.log('================================================================================');
  console.log(`Total checks performed: ${results.summary.totalChecks}`);
  console.log(`Failed checks: ${results.summary.failedChecks}`);
  console.log(`Overall result: ${results.passed ? '✅ PASSED' : '❌ FAILED'}`);

  if (!results.passed) {
    console.log('\n🐛 Bug Condition Confirmed - Counterexamples Found:');
    console.log('----------------------------------------------------');

    results.counterexamples.forEach((example, index) => {
      console.log(`${index + 1}. File: ${example.file}`);
      console.log(`   Issue: ${example.issue}`);
      console.log(`   Documented: ${example.documented}`);
      console.log(`   Expected: ${example.expected}`);
      console.log(`   Location: ${example.location}`);
      console.log('');
    });

    console.log('📋 Summary of Inconsistencies:');
    results.summary.inconsistencies.forEach((inconsistency, index) => {
      console.log(`${index + 1}. ${inconsistency}`);
    });

    console.log('\n🎯 Root Cause Analysis:');
    console.log('The bug exists because documentation files are not synchronized with the actual');
    console.log('seed data. Users viewing documentation see incorrect or missing default credentials,');
    console.log('preventing successful login on new deployments.');

    console.log('\n✅ Expected Behavior After Fix:');
    console.log('All documentation should consistently show:');
    console.log(`- Username: ${TEST_CONFIG.EXPECTED_ADMIN_USERNAME}`);
    console.log(`- Password: ${TEST_CONFIG.EXPECTED_ADMIN_PASSWORD}`);
    console.log('- Appropriate security warnings for production environments');
  } else {
    console.log('\n✅ All documentation is consistent with seed data!');
    console.log('No bug condition detected - documentation properly synchronized.');
  }

  return results;
}

// Run the test
console.log('🚀 Starting Bug Condition Exploration Test');
console.log('==========================================');
console.log('This test explores the default login credentials documentation inconsistency bug.');
console.log('EXPECTED RESULT: Test should FAIL on unfixed documentation (proving bug exists).');
console.log('');

const testResults = testBugCondition();

// Exit with appropriate code
if (testResults.passed) {
  console.log('\n🎉 Test PASSED - No bug condition detected');
  console.log('(This means documentation is already fixed or bug does not exist)');
  process.exit(0);
} else {
  console.log('\n🐛 Test FAILED - Bug condition confirmed');
  console.log('(This is EXPECTED for exploration test - proves bug exists)');
  console.log('\nCounterexamples found:', testResults.counterexamples.length);
  process.exit(1);
}
