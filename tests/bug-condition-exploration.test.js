/**
 * Bug Condition Exploration Tests
 *
 * **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
 *
 * These tests verify that the bug exists in current documentation.
 * Tests MUST fail to prove bug exists - failure is success for exploration tests.
 *
 * Bug Condition: Users cannot successfully login with documented default credentials
 * because documentation shows inconsistent/missing default credential information.
 */

const fs = require('fs');
const path = require('path');

describe('Bug Condition Exploration - Default Login Credentials Documentation', () => {

  describe('Property 1: Bug Condition - Default Credentials Documentation Inconsistency', () => {

    test('1.1 使用手册 should show correct admin password consistent with seed data', () => {
      // **Validates: Requirements 1.2**
      // Read the user manual file
      const manualPath = path.join(process.cwd(), '使用手册.md');
      const manualContent = fs.readFileSync(manualPath, 'utf8');

      // Extract the test accounts table section
      const tableMatch = manualContent.match(/\|.*用户名.*\|.*密码.*\|.*角色.*\|([\s\S]*?)\n\n/);
      expect(tableMatch).toBeTruthy();

      const tableContent = tableMatch[1];

      // Check if admin password matches seed data (Admin123456)
      const adminRowMatch = tableContent.match(/\|\s*admin\s*\|\s*([^|]+)\s*\|/);
      expect(adminRowMatch).toBeTruthy();

      const documentedPassword = adminRowMatch[1].trim();

      // This should fail because documented password is 'admin123' but actual is 'Admin123456'
      expect(documentedPassword).toBe('Admin123456');
    });

    test('1.2 部署文档 should contain default credentials information', () => {
      // **Validates: Requirements 1.4**
      // Read the deployment documentation
      const deployPath = path.join(process.cwd(), '部署.md');
      const deployContent = fs.readFileSync(deployPath, 'utf8');

      // Check for default credentials section
      const hasDefaultCredentials = deployContent.includes('默认登录凭据') ||
                                   deployContent.includes('默认凭据') ||
                                   deployContent.includes('admin') && deployContent.includes('Admin123456');

      // This should fail because deployment docs lack default credentials info
      expect(hasDefaultCredentials).toBe(true);
    });

    test('1.3 README should contain quick login information', () => {
      // **Validates: Requirements 2.1**
      // Read the README file
      const readmePath = path.join(process.cwd(), 'README.md');
      const readmeContent = fs.readFileSync(readmePath, 'utf8');

      // Check for login information in README
      const hasLoginInfo = readmeContent.includes('默认登录') ||
                          readmeContent.includes('登录凭据') ||
                          (readmeContent.includes('admin') && readmeContent.includes('Admin123456'));

      // This should fail because README lacks quick login information
      expect(hasLoginInfo).toBe(true);
    });

    test('1.4 登录页面 should provide default credential hints', () => {
      // **Validates: Requirements 2.3**
      // Read the login page component
      const loginPath = path.join(process.cwd(), 'frontend/src/pages/login/index.tsx');
      const loginContent = fs.readFileSync(loginPath, 'utf8');

      // Check for default credential hints in login page
      const hasCredentialHints = loginContent.includes('默认') ||
                                 loginContent.includes('admin') ||
                                 loginContent.includes('Admin123456') ||
                                 loginContent.includes('测试账号');

      // This should fail because login page lacks default credential hints
      expect(hasCredentialHints).toBe(true);
    });

    test('1.5 Seed data verification - actual admin password', () => {
      // **Validates: Requirements 3.2**
      // Read the seed file to verify actual password
      const seedPath = path.join(process.cwd(), 'backend/prisma/seed.ts');
      const seedContent = fs.readFileSync(seedPath, 'utf8');

      // Extract the admin password from seed data
      const passwordMatch = seedContent.match(/hashPassword\(["']([^"']+)["']\)/);
      expect(passwordMatch).toBeTruthy();

      const actualPassword = passwordMatch[1];

      // Verify the actual password is Admin123456
      expect(actualPassword).toBe('Admin123456');
    });

    test('1.6 Cross-reference documentation consistency', () => {
      // **Validates: Requirements 1.1, 1.2, 1.3, 1.4**
      // This test checks overall consistency across all documentation

      // Read all documentation files
      const manualPath = path.join(process.cwd(), '使用手册.md');
      const deployPath = path.join(process.cwd(), '部署.md');
      const readmePath = path.join(process.cwd(), 'README.md');
      const seedPath = path.join(process.cwd(), 'backend/prisma/seed.ts');

      const manualContent = fs.readFileSync(manualPath, 'utf8');
      const deployContent = fs.readFileSync(deployPath, 'utf8');
      const readmeContent = fs.readFileSync(readmePath, 'utf8');
      const seedContent = fs.readFileSync(seedPath, 'utf8');

      // Extract actual password from seed
      const seedPasswordMatch = seedContent.match(/hashPassword\(["']([^"']+)["']\)/);
      const actualPassword = seedPasswordMatch[1];

      // Extract documented password from manual
      const manualTableMatch = manualContent.match(/\|.*用户名.*\|.*密码.*\|.*角色.*\|([\s\S]*?)\n\n/);
      const manualTableContent = manualTableMatch[1];
      const adminRowMatch = manualTableContent.match(/\|\s*admin\s*\|\s*([^|]+)\s*\|/);
      const documentedPassword = adminRowMatch[1].trim();

      // Check if all documentation consistently shows the correct password
      const allDocsConsistent =
        documentedPassword === actualPassword &&
        deployContent.includes(actualPassword) &&
        readmeContent.includes(actualPassword);

      // This should fail because documentation is inconsistent
      expect(allDocsConsistent).toBe(true);
    });
  });
});
