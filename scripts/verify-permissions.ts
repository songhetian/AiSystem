#!/usr/bin/env ts-node
/**
 * 权限配置验证脚本
 * 检查所有 Controller 的 API 端点是否配置了权限
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

interface EndpointInfo {
  file: string;
  line: number;
  method: string;
  path: string;
  hasPermission: boolean;
  permissionCode?: string;
}

interface ValidationResult {
  totalEndpoints: number;
  withPermission: number;
  withoutPermission: number;
  endpoints: EndpointInfo[];
  missingPermissions: EndpointInfo[];
}

/**
 * 解析 Controller 文件，提取 API 端点信息
 */
function parseControllerFile(filePath: string): EndpointInfo[] {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const endpoints: EndpointInfo[] = [];

  const httpMethods = ["Get", "Post", "Put", "Patch", "Delete"];
  const methodRegex = new RegExp(
    `@(${httpMethods.join("|")})\\(([^)]*)\\)`,
    "g",
  );

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const methodMatch = line.match(methodRegex);

    if (methodMatch) {
      const method = methodMatch[0].match(/@(\w+)/)?.[1] || "";
      const pathMatch = methodMatch[0].match(/\(["']?([^"')]*)/);
      const endpointPath = pathMatch ? pathMatch[1] : "";

      // 向上查找是否有 @Permission 装饰器
      let hasPermission = false;
      let permissionCode = "";

      for (let j = i - 1; j >= Math.max(0, i - 10); j--) {
        const prevLine = lines[j];

        // 如果遇到另一个方法定义，停止查找
        if (prevLine.match(/@(Get|Post|Put|Patch|Delete)\(/)) {
          break;
        }

        const permissionMatch = prevLine.match(
          /@Permission\(["']([^"']+)["']\)/,
        );
        if (permissionMatch) {
          hasPermission = true;
          permissionCode = permissionMatch[1];
          break;
        }
      }

      endpoints.push({
        file: filePath,
        line: i + 1,
        method: method.toUpperCase(),
        path: endpointPath,
        hasPermission,
        permissionCode,
      });
    }
  }

  return endpoints;
}

/**
 * 扫描所有 Controller 文件
 */
async function scanControllers(): Promise<ValidationResult> {
  const controllersPattern = "backend/src/**/*.controller.ts";
  const files = await glob(controllersPattern, { ignore: "node_modules/**" });

  const allEndpoints: EndpointInfo[] = [];

  for (const file of files) {
    const endpoints = parseControllerFile(file);
    allEndpoints.push(...endpoints);
  }

  const missingPermissions = allEndpoints.filter((e) => !e.hasPermission);

  return {
    totalEndpoints: allEndpoints.length,
    withPermission: allEndpoints.filter((e) => e.hasPermission).length,
    withoutPermission: missingPermissions.length,
    endpoints: allEndpoints,
    missingPermissions,
  };
}

/**
 * 生成验证报告
 */
function generateReport(result: ValidationResult): string {
  const lines: string[] = [];

  lines.push("# 权限配置验证报告\n");
  lines.push(`生成时间: ${new Date().toLocaleString("zh-CN")}\n`);
  lines.push("## 统计摘要\n");
  lines.push(`- 总端点数: ${result.totalEndpoints}`);
  lines.push(
    `- 已配置权限: ${result.withPermission} (${((result.withPermission / result.totalEndpoints) * 100).toFixed(1)}%)`,
  );
  lines.push(
    `- 缺失权限: ${result.withoutPermission} (${((result.withoutPermission / result.totalEndpoints) * 100).toFixed(1)}%)\n`,
  );

  if (result.missingPermissions.length > 0) {
    lines.push("## ⚠️ 缺失权限配置的端点\n");
    lines.push("| 文件 | 行号 | 方法 | 路径 |");
    lines.push("|------|------|------|------|");

    for (const endpoint of result.missingPermissions) {
      const fileName = path.basename(endpoint.file);
      lines.push(
        `| ${fileName} | ${endpoint.line} | ${endpoint.method} | ${endpoint.path || "/"} |`,
      );
    }
    lines.push("");
  }

  lines.push("## ✅ 已配置权限的端点\n");
  lines.push("| 文件 | 行号 | 方法 | 路径 | 权限代码 |");
  lines.push("|------|------|------|------|----------|");

  const withPermission = result.endpoints.filter((e) => e.hasPermission);
  for (const endpoint of withPermission) {
    const fileName = path.basename(endpoint.file);
    lines.push(
      `| ${fileName} | ${endpoint.line} | ${endpoint.method} | ${endpoint.path || "/"} | ${endpoint.permissionCode} |`,
    );
  }

  return lines.join("\n");
}

/**
 * 主函数
 */
async function main() {
  console.log("🔍 开始扫描 API 端点权限配置...\n");

  const result = await scanControllers();

  console.log("📊 扫描完成！");
  console.log(`   总端点数: ${result.totalEndpoints}`);
  console.log(`   已配置权限: ${result.withPermission}`);
  console.log(`   缺失权限: ${result.withoutPermission}\n`);

  if (result.withoutPermission > 0) {
    console.log("⚠️  发现缺失权限配置的端点：");
    for (const endpoint of result.missingPermissions) {
      console.log(
        `   - ${path.basename(endpoint.file)}:${endpoint.line} ${endpoint.method} ${endpoint.path || "/"}`,
      );
    }
    console.log("");
  }

  // 生成报告
  const report = generateReport(result);
  const reportPath = "PERMISSION_VERIFICATION_REPORT.md";
  fs.writeFileSync(reportPath, report);

  console.log(`📄 详细报告已生成: ${reportPath}`);

  // 如果有缺失权限，返回非零退出码
  process.exit(result.withoutPermission > 0 ? 1 : 0);
}

main().catch((error) => {
  console.error("❌ 执行失败:", error);
  process.exit(1);
});
