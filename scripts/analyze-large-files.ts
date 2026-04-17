#!/usr/bin/env ts-node
/**
 * 大文件分析脚本
 * 分析超过 500 行的文件，并提供拆分建议
 */

import * as fs from "fs";
import * as path from "path";
import { glob } from "glob";

interface FileAnalysis {
  path: string;
  lines: number;
  functions: number;
  classes: number;
  imports: number;
  exports: number;
  complexity: "low" | "medium" | "high" | "very_high";
  suggestions: string[];
}

/**
 * 分析文件内容
 */
function analyzeFile(filePath: string): FileAnalysis {
  const content = fs.readFileSync(filePath, "utf-8");
  const lines = content.split("\n");
  const lineCount = lines.length;

  // 统计函数和类
  const functionMatches =
    content.match(/\b(function|async\s+function|\w+\s*=\s*\(.*?\)\s*=>)/g) ||
    [];
  const classMatches = content.match(/\bclass\s+\w+/g) || [];
  const importMatches = content.match(/^import\s+/gm) || [];
  const exportMatches = content.match(/^export\s+/gm) || [];

  const functionCount = functionMatches.length;
  const classCount = classMatches.length;
  const importCount = importMatches.length;
  const exportCount = exportMatches.length;

  // 评估复杂度
  let complexity: "low" | "medium" | "high" | "very_high" = "low";
  if (lineCount > 1000) {
    complexity = "very_high";
  } else if (lineCount > 700) {
    complexity = "high";
  } else if (lineCount > 500) {
    complexity = "medium";
  }

  // 生成拆分建议
  const suggestions: string[] = [];

  if (lineCount > 500) {
    suggestions.push(`文件过大（${lineCount} 行），建议拆分为多个小文件`);
  }

  if (functionCount > 20) {
    suggestions.push(`函数过多（${functionCount} 个），建议按功能模块拆分`);
  }

  if (classCount > 1) {
    suggestions.push(`包含多个类（${classCount} 个），建议每个类独立一个文件`);
  }

  // 分析文件名，提供具体建议
  const fileName = path.basename(filePath, ".ts");
  if (fileName.includes(".service")) {
    suggestions.push("建议拆分为：");
    suggestions.push("  - 核心业务逻辑（core.service.ts）");
    suggestions.push("  - 查询操作（query.service.ts）");
    suggestions.push("  - 写入操作（command.service.ts）");
    suggestions.push("  - 工具函数（utils.ts）");
  }

  return {
    path: filePath,
    lines: lineCount,
    functions: functionCount,
    classes: classCount,
    imports: importCount,
    exports: exportCount,
    complexity,
    suggestions,
  };
}

/**
 * 扫描大文件
 */
async function scanLargeFiles(
  threshold: number = 500,
): Promise<FileAnalysis[]> {
  const pattern = "backend/src/**/*.ts";
  const files = await glob(pattern, {
    ignore: ["node_modules/**", "**/*.spec.ts", "**/*.test.ts"],
  });

  const analyses: FileAnalysis[] = [];

  for (const file of files) {
    const content = fs.readFileSync(file, "utf-8");
    const lineCount = content.split("\n").length;

    if (lineCount > threshold) {
      const analysis = analyzeFile(file);
      analyses.push(analysis);
    }
  }

  return analyses.sort((a, b) => b.lines - a.lines);
}

/**
 * 生成报告
 */
function generateReport(analyses: FileAnalysis[]): string {
  const lines: string[] = [];

  lines.push("# 大文件分析报告\n");
  lines.push(`生成时间: ${new Date().toLocaleString("zh-CN")}\n`);
  lines.push("## 统计摘要\n");
  lines.push(`- 超过 500 行的文件数: ${analyses.length}`);
  lines.push(`- 最大文件行数: ${analyses[0]?.lines || 0}`);
  lines.push(
    `- 平均行数: ${Math.round(analyses.reduce((sum, a) => sum + a.lines, 0) / analyses.length)}\n`,
  );

  lines.push("## 文件列表\n");
  lines.push("| 文件 | 行数 | 函数数 | 类数 | 复杂度 |");
  lines.push("|------|------|--------|------|--------|");

  for (const analysis of analyses) {
    const fileName = path.basename(analysis.path);
    const complexityEmoji = {
      low: "🟢",
      medium: "🟡",
      high: "🟠",
      very_high: "🔴",
    }[analysis.complexity];

    lines.push(
      `| ${fileName} | ${analysis.lines} | ${analysis.functions} | ${analysis.classes} | ${complexityEmoji} ${analysis.complexity} |`,
    );
  }

  lines.push("\n## 详细分析和拆分建议\n");

  for (const analysis of analyses) {
    lines.push(`### ${path.basename(analysis.path)}\n`);
    lines.push(`**路径**: \`${analysis.path}\`\n`);
    lines.push(`**统计**:`);
    lines.push(`- 行数: ${analysis.lines}`);
    lines.push(`- 函数数: ${analysis.functions}`);
    lines.push(`- 类数: ${analysis.classes}`);
    lines.push(`- 导入数: ${analysis.imports}`);
    lines.push(`- 导出数: ${analysis.exports}`);
    lines.push(`- 复杂度: ${analysis.complexity}\n`);

    if (analysis.suggestions.length > 0) {
      lines.push("**拆分建议**:\n");
      for (const suggestion of analysis.suggestions) {
        lines.push(`${suggestion}`);
      }
      lines.push("");
    }
  }

  return lines.join("\n");
}

/**
 * 主函数
 */
async function main() {
  console.log("🔍 开始扫描大文件...\n");

  const analyses = await scanLargeFiles(500);

  console.log("📊 扫描完成！");
  console.log(`   发现 ${analyses.length} 个超过 500 行的文件\n`);

  if (analyses.length > 0) {
    console.log("📋 文件列表（按行数排序）：");
    for (const analysis of analyses.slice(0, 10)) {
      console.log(
        `   ${analysis.lines.toString().padStart(4)} 行 - ${path.basename(analysis.path)}`,
      );
    }
    console.log("");
  }

  // 生成报告
  const report = generateReport(analyses);
  const reportPath = "LARGE_FILES_ANALYSIS_REPORT.md";
  fs.writeFileSync(reportPath, report);

  console.log(`📄 详细报告已生成: ${reportPath}`);
}

main().catch((error) => {
  console.error("❌ 执行失败:", error);
  process.exit(1);
});
