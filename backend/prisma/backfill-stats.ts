import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

/**
 * 考勤统计历史数据补全脚本 (V5.0 Backfill)
 * 职责：扫描所有历史考勤记录，生成初始的月度汇总快照。
 */
async function backfill() {
  console.log('开始执行 V5.0 考勤数据回填脚本...');
  
  // 1. 获取所有有考勤记录的员工和月份组合
  const groups = await prisma.attendance_record.groupBy({
    by: ['employee_id', 'attendance_date'],
    where: { is_deleted: 0 }
  });

  const employeeMonthMap = new Set<string>();
  groups.forEach(g => {
    const date = new Date(g.attendance_date);
    const month = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}`;
    employeeMonthMap.add(`${g.employee_id}|${month}`);
  });

  console.log(`检测到 ${employeeMonthMap.size} 组待处理的 [员工-月份] 数据...`);

  // 2. 逐组进行聚合计算并写入汇总表
  let count = 0;
  for (const item of employeeMonthMap) {
    const [employeeId, month] = item.split('|');
    const [year, monthNum] = month.split('-').map(Number);
    const startDate = new Date(year, monthNum - 1, 1);
    const endDate = new Date(year, monthNum, 0);

    const records = await prisma.attendance_record.findMany({
      where: {
        employee_id: employeeId,
        attendance_date: { gte: startDate, lte: endDate },
        is_deleted: 0
      }
    });

    const employee = await prisma.hr_employee.findUnique({
      where: { id: employeeId },
      select: { platform_id: true, department_id: true }
    });

    const summary = {
      normal_days: records.filter(r => r.on_duty_status === 1 && r.off_duty_status === 1).length,
      late_count: records.filter(r => r.on_duty_status === 2).length,
      early_count: records.filter(r => r.off_duty_status === 3).length,
      absent_days: records.filter(r => r.on_duty_status === 4 || r.off_duty_status === 4).length,
      miss_count: records.filter(r => r.on_duty_status === 5 || r.off_duty_status === 5).length
    };

    await prisma.attendance_monthly_summary.upsert({
      where: { employee_id_month: { employee_id: employeeId, month } },
      create: {
        employee_id: employeeId,
        month,
        ...summary,
        platform_id: employee?.platform_id,
        dept_id: employee?.department_id
      },
      update: summary
    });

    count++;
    if (count % 10 === 0) console.log(`进度: ${count}/${employeeMonthMap.size}...`);
  }

  console.log('✅ 数据回填任务圆满完成！');
}

backfill()
  .catch((e) => {
    console.error('回填失败:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
