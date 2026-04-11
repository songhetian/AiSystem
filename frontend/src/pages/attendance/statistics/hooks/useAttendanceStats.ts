import { useMemo } from 'react';

export const useAttendanceStats = (data: any[]) => {
  return useMemo(() => {
    if (!data || data.length === 0) {
      return { total_employees: 0, avg_normal_rate: 0, total_exceptions: 0 };
    }

    const total = data.length;
    const normalSum = data.reduce((acc, curr) => acc + (curr.normal_days / (curr.total_records || 1)), 0);
    const exceptionSum = data.reduce((acc, curr) => acc + curr.late_count + curr.early_count + curr.absent_days + curr.miss_count, 0);

    return {
      total_employees: total,
      avg_normal_rate: (normalSum / total) * 100,
      total_exceptions: exceptionSum,
    };
  }, [data]);
};
