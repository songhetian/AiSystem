/**
 * 通用 CSV 导出工具
 * 符合 PRD 2.9.4 报表导出需求
 */
export const downloadCSV = (data: any[], filename: string, headers: { label: string; key: string }[]) => {
  if (!data || data.length === 0) return;

  const headerRow = headers.map(h => h.label).join(',');
  const rows = data.map(item => {
    return headers.map(h => {
      const val = item[h.key] ?? '';
      // 处理逗号和引号
      const escapedVal = String(val).replace(/"/g, '""');
      return `"${escapedVal}"`;
    }).join(',');
  });

  const content = [headerRow, ...rows].join('\n');
  const blob = new Blob(['\ufeff' + content], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  
  const url = URL.createObjectURL(blob);
  link.setAttribute('href', url);
  link.setAttribute('download', `${filename}_${new Date().getTime()}.csv`);
  link.style.visibility = 'hidden';
  
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
};
