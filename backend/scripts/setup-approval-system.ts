#!/usr/bin/env ts-node

/**
 * 审批系统数据库初始化脚本
 *
 * 此脚本用于：
 * 1. 执行数据库迁移
 * 2. 初始化审批系统数据
 * 3. 验证数据完整性
 */

import { execSync } from 'child_process';
import { PrismaClient } from '@prisma/client';
import { seedApprovalSystem } from '../prisma/seed-approval-system';

const prisma = new PrismaClient();

async function setupApprovalSystem() {
  console.log('🚀 开始设置审批系统...\n');

  try {
    // 1. 检查数据库连接
    console.log('📡 检查数据库连接...');
    await prisma.$connect();
    console.log('✅ 数据库连接成功\n');

    // 2. 执行数据库迁移
    console.log('📦 执行数据库迁移...');
    try {
      execSync('npx prisma migrate deploy', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ 数据库迁移完成\n');
    } catch (error) {
      console.log('⚠️  迁移可能已存在，继续执行...\n');
    }

    // 3. 生成Prisma客户端
    console.log('🔧 生成Prisma客户端...');
    try {
      execSync('npx prisma generate', {
        stdio: 'inherit',
        cwd: process.cwd()
      });
      console.log('✅ Prisma客户端生成完成\n');
    } catch (error) {
      console.log('⚠️  客户端生成失败，但可能不影响运行\n');
    }

    // 4. 初始化审批系统数据
    console.log('📋 初始化审批系统数据...');
    await seedApprovalSystem();
    console.log('✅ 审批系统数据初始化完成\n');

    // 5. 验证数据完整性
    console.log('🔍 验证数据完整性...');
    await validateData();
    console.log('✅ 数据完整性验证通过\n');

    // 6. 显示设置结果
    await showSetupResult();

    console.log('🎉 审批系统设置完成！');
    console.log('\n📖 更多信息请查看: backend/prisma/APPROVAL_SYSTEM_DATABASE.md');

  } catch (error) {
    console.error('❌ 审批系统设置失败:', error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

async function validateData() {
  // 验证关键表是否存在数据
  const checks = [
    {
      name: '费用类型',
      count: await prisma.fin_expense_type.count(),
      expected: 6
    },
    {
      name: '审批模板',
      count: await prisma.approval_template.count(),
      expected: 3
    },
    {
      name: '系统配置',
      count: await prisma.sys_config.count({
        where: { config_key: { startsWith: 'approval.' } }
      }),
      expected: 7
    }
  ];

  for (const check of checks) {
    if (check.count < check.expected) {
      throw new Error(`${check.name}数据不完整: 期望 ${check.expected} 个，实际 ${check.count} 个`);
    }
    console.log(`   ✓ ${check.name}: ${check.count} 个`);
  }
}

async function showSetupResult() {
  console.log('📊 设置结果统计:');

  // 统计各类数据
  const stats = {
    '费用类型': await prisma.fin_expense_type.count(),
    '审批模板': await prisma.approval_template.count(),
    '审批实例': await prisma.approval_instances.count(),
    '审批记录': await prisma.approval_records.count(),
    '财务记录': await prisma.financial_records.count(),
    '报销记录': await prisma.fin_reimbursement.count(),
    '采购记录': await prisma.fin_purchase.count(),
  };

  for (const [name, count] of Object.entries(stats)) {
    console.log(`   ${name}: ${count} 条`);
  }

  // 显示可用的审批模板
  console.log('\n📋 可用审批模板:');
  const templates = await prisma.approval_template.findMany({
    where: { status: 'enabled' },
    select: { name: true, type: true, description: true }
  });

  templates.forEach(template => {
    console.log(`   • ${template.name} (${template.type})`);
    console.log(`     ${template.description}`);
  });

  // 显示可用的费用类型
  console.log('\n💰 可用费用类型:');
  const expenseTypes = await prisma.fin_expense_type.findMany({
    where: { status: 1 },
    select: { name: true, code: true, description: true }
  });

  expenseTypes.forEach(type => {
    console.log(`   • ${type.name} (${type.code})`);
    console.log(`     ${type.description}`);
  });
}

// 如果直接运行此脚本
if (require.main === module) {
  setupApprovalSystem();
}

export { setupApprovalSystem };
