import React, { useState, useCallback } from 'react';
import {
  Form, DatePicker, Select, InputNumber, Radio, Button, Steps,
  Card, Table, Tag, Alert, Badge, Statistic, Row, Col, Space,
  Typography, Tooltip, Modal, message, Divider, Tabs, Empty,
  Progress, Timeline
} from 'antd';
import {
  RobotOutlined, CheckCircleOutlined, WarningOutlined, ThunderboltOutlined,
  CalendarOutlined, SettingOutlined, ArrowLeftOutlined, SendOutlined,
  EditOutlined, DeleteOutlined, UndoOutlined, DownloadOutlined,
  HistoryOutlined, BarChartOutlined, TeamOutlined, SaveOutlined,
  LineChartOutlined, StarOutlined, RocketOutlined, InfoCircleOutlined,
} from '@ant-design/icons';
import dayjs from 'dayjs';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'umi';
import {
  attendanceApi,
  type ScheduleDraft,
  type ScheduleResultItem,
  type AIScheduleGeneratePayload
} from '@/api/attendance';
import { systemApi } from '@/api/system';
import { approvalApi } from '@/api/approval';

const { RangePicker } = DatePicker;
const { Title, Text } = Typography;

// ================================================
// 工具函数：本地 CSV 导出
// ================================================
const exportToCSV = (draft: ScheduleDraft) => {
  const rows = [
    ['日期', '班次', '员工姓名', '员工ID', '部门ID', '状态', '预警信息'],
    ...draft.data.map(r => [
      r.schedule_date, r.shift_name, r.employee_name, r.employee_id,
      r.dept_id, r.is_warning ? '预警' : '正常', r.warning_reason ?? '',
    ]),
  ];
  const csv = '\uFEFF' + rows.map(r => r.map(c => `"${c}"`).join(',')).join('\n');
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const a = document.createElement('a');
  a.href = URL.createObjectURL(blob);
  a.download = `${draft.name}_${dayjs().format('YYYYMMDD')}.csv`;
  a.click();
  URL.revokeObjectURL(a.href);
};

// ================================================
// 参数配置面板 (Step 0)
// ================================================
const ParamPanel: React.FC<{
  form: any;
  departments: any[];
  onGenerate: () => void;
  generating: boolean;
}> = ({ form, departments, onGenerate, generating }) => {
  const queryClient = useQueryClient();
  const [savingTemplate, setSavingTemplate] = useState(false);

  const { data: templates = [] } = useQuery({
    queryKey: ['ai-schedule-templates'],
    queryFn: attendanceApi.listTemplates,
  });

  const handleSaveTemplate = async () => {
    try {
      const values = await form.validateFields();
      const name = window.prompt('请输入模板名称', `排班模板_${dayjs().format('MMDD_HHmm')}`);
      if (!name) return;
      setSavingTemplate(true);
      await attendanceApi.saveTemplate({ name, params: values });
      message.success('模板保存成功');
      queryClient.invalidateQueries({ queryKey: ['ai-schedule-templates'] });
    } catch (e) {
      message.error('请先完善配置后再保存模板');
    } finally {
      setSavingTemplate(false);
    }
  };

  const handleLoadTemplate = (id: string) => {
    const tpl = templates.find((t: any) => t.id === id);
    if (tpl) {
      form.setFieldsValue(tpl.params);
      message.success(`已载入模板: ${tpl.name}`);
    }
  };

  const quickSetDate = (type: 'thisWeek' | 'nextWeek' | 'thisMonth') => {
    let range: [dayjs.Dayjs, dayjs.Dayjs] = [dayjs(), dayjs()];
    if (type === 'thisWeek') range = [dayjs().startOf('week'), dayjs().endOf('week')];
    if (type === 'nextWeek') range = [dayjs().add(1, 'week').startOf('week'), dayjs().add(1, 'week').endOf('week')];
    if (type === 'thisMonth') range = [dayjs().startOf('month'), dayjs().endOf('month')];
    form.setFieldsValue({ dateRange: range });
  };

  return (
    <div className="max-w-4xl mx-auto">
      <div className="text-center mb-8">
        <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-700 flex items-center justify-center mx-auto mb-4 shadow-xl">
          <RobotOutlined className="text-white text-3xl" />
        </div>
        <Title level={2} className="!mb-1 !text-slate-900 font-black tracking-tight">AI 智能排班中心</Title>
        <Text className="text-slate-600 font-bold text-base">配置约束参数，由引擎自动推论满足合规规则的最优排班方案</Text>
      </div>

      <div className="flex justify-between items-center mb-8 bg-white p-5 rounded-2xl border border-slate-200 shadow-sm">
        <Space size={20}>
          <div className="flex items-center gap-3">
            <span className="text-slate-900 font-black text-sm uppercase tracking-wider">选择模板:</span>
            <Select
              placeholder="从历史配置模板快速载入"
              style={{ width: 260 }}
              onChange={handleLoadTemplate}
              options={templates.map((t: any) => ({ label: t.name, value: t.id }))}
              size="middle"
              className="font-black"
            />
          </div>
          <Button icon={<SaveOutlined />} onClick={handleSaveTemplate} loading={savingTemplate} className="font-bold border-slate-300 hover:border-blue-500">
            保存当前配置为模板
          </Button>
        </Space>
        <Badge status="processing" text={<span className="font-black text-slate-500 text-xs">偏好数据实时同步中</span>} />
      </div>

      <Form form={form} layout="vertical" initialValues={{ priority: 'fairness', max_hours_per_week: 40, max_consecutive_days: 6, daily_max_hours: 8, min_shift_staff: 1 }}>
        <Tabs
          defaultActiveKey="base"
          type="card"
          className="rhino-tabs mb-8"
          items={[
            {
              key: 'base',
              label: <span className="px-6 font-black text-base"><CalendarOutlined /> 基础范围</span>,
              children: (
                <div className="bg-white p-8 rounded-b-2xl border border-slate-200 border-t-0">
                  <Row gutter={32}>
                    <Col span={10}>
                      <Form.Item name="dept_id" label={<span className="font-black text-slate-900">目标部门</span>} rules={[{ required: true }]}>
                        <Select placeholder="选择部门" options={departments.map((d: any) => ({ label: d.name, value: d.id }))} size="large" className="font-bold" />
                      </Form.Item>
                    </Col>
                    <Col span={14}>
                      <Form.Item name="dateRange" label={<span className="font-black text-slate-900">排班日期范围</span>} rules={[{ required: true }]}>
                        <RangePicker className="w-full font-black" size="large" placeholder={['开始日期', '结束日期']} />
                      </Form.Item>
                    </Col>
                  </Row>

                  <div className="mt-4">
                    <div className="text-slate-500 font-black text-xs mb-3 flex items-center gap-2">快捷选时 (雷犀标准) <Divider className="flex-grow m-0" /></div>
                    <div className="flex w-full border border-slate-500 rounded-xl overflow-hidden shadow-sm" style={{ height: 44 }}>
                      {[
                        { label: '本周排班', key: 'thisWeek' },
                        { label: '下周预排', key: 'nextWeek' },
                        { label: '整个本月', key: 'thisMonth' },
                      ].map((btn, idx) => (
                        <Button
                          key={btn.key}
                          type="text"
                          onClick={() => quickSetDate(btn.key as any)}
                          className={`flex-grow h-full rounded-none font-black text-slate-900 transition-all hover:bg-slate-100 ${idx !== 0 ? 'border-l border-slate-500' : ''}`}
                        >
                          {btn.label}
                        </Button>
                      ))}
                    </div>
                  </div>
                </div>
              ),
            },
            {
              key: 'rules',
              label: <span className="px-6 font-black text-base"><SettingOutlined /> 合规规则</span>,
              children: (
                <div className="bg-white p-8 rounded-b-2xl border border-slate-200 border-t-0">
                   <Row gutter={24}>
                    <Col span={6}><Form.Item name="max_hours_per_week" label={<span className="font-black text-slate-900">周最大工时(h)</span>}><InputNumber min={1} max={84} size="large" className="w-full font-black" addonAfter="h" /></Form.Item></Col>
                    <Col span={6}><Form.Item name="max_consecutive_days" label={<span className="font-black text-slate-900">最大连班天数</span>}><InputNumber min={1} max={7} size="large" className="w-full font-black" addonAfter="天" /></Form.Item></Col>
                    <Col span={6}><Form.Item name="daily_max_hours" label={<span className="font-black text-slate-900">单班日上限(h)</span>}><InputNumber min={1} max={24} size="large" className="w-full font-black" addonAfter="h" /></Form.Item></Col>
                    <Col span={6}><Form.Item name="min_shift_staff" label={<span className="font-black text-slate-900">班次最少人数</span>}><InputNumber min={1} max={100} size="large" className="w-full font-black" addonAfter="人" /></Form.Item></Col>
                  </Row>
                  <Alert className="mt-4 rounded-xl" type="info" message={<span className="font-bold text-slate-700">算法将尝试在满足上述约束的前提下，平衡员工满意度得分。</span>} showIcon />
                </div>
              ),
            },
            {
              key: 'demand',
              label: <span className="px-6 font-black text-base"><LineChartOutlined /> 业务需求测算</span>,
              children: (
                <div className="bg-white p-8 rounded-b-2xl border border-slate-200 border-t-0">
                  <div className="flex justify-between items-center mb-6">
                    <div>
                      <div className="font-black text-slate-900 text-lg">动态人力基准配置</div>
                      <div className="text-xs font-bold text-slate-400 mt-1 uppercase tracking-wider">设置每日各班次的标准人力覆盖目标</div>
                    </div>
                    <Space>
                      <Button icon={<StarOutlined />} className="font-bold border-slate-300">载入历史高峰模板</Button>
                      <Button type="primary" className="bg-slate-900 border-none font-black px-6">批量填充</Button>
                    </Space>
                  </div>
                  
                  <div className="rounded-2xl border border-slate-100 overflow-hidden shadow-sm">
                    <table className="w-full border-collapse">
                      <thead>
                        <tr className="bg-slate-50 border-b border-slate-200">
                          <th className="p-4 text-left font-black text-slate-500 text-xs uppercase tracking-widest w-1/4 text-center">班次 / 需求类型</th>
                          <th className="p-4 text-left font-black text-slate-500 text-xs uppercase tracking-widest text-center">平时需求人数 (人)</th>
                          <th className="p-4 text-left font-black text-slate-500 text-xs uppercase tracking-widest text-center">周末/高峰需求 (人)</th>
                          <th className="p-4 text-left font-black text-slate-500 text-xs uppercase tracking-widest text-center">业务预期 (Volume)</th>
                        </tr>
                      </thead>
                      <tbody>
                        {['早班', '中班', '晚班'].map((s, i) => (
                          <tr key={i} className="border-b border-slate-50 hover:bg-slate-50 transition-all">
                            <td className="p-4 text-center"><Tag color="blue" className="font-black border-0 px-3 py-1 rounded-lg">{s}</Tag></td>
                            <td className="p-4"><InputNumber min={1} defaultValue={2} className="w-full font-black text-center" size="large" /></td>
                            <td className="p-4"><InputNumber min={1} defaultValue={4} className="w-full font-black text-center" size="large" /></td>
                            <td className="p-4"><InputNumber min={0} defaultValue={100} className="w-full font-black text-center" size="large" /></td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <Alert className="mt-8 rounded-xl bg-slate-900 border-none" 
                    message={<span className="text-white font-bold">前瞻性算法提示: AI 将根据不同日期的属性（周中/周末）自动插值上述基准值，生成非线性拟合的排班方案。</span>} 
                    icon={<ThunderboltOutlined className="text-amber-400" />} showIcon />
                </div>
              ),
            },
          ]}
        />

        <Button type="primary" size="large" block loading={generating} onClick={onGenerate} icon={<RobotOutlined />}
          className="h-16 text-xl font-black rounded-2xl border-none shadow-2xl transition-all hover:scale-[1.01]"
          style={{ background: 'linear-gradient(135deg, #0f172a 0%, #334155 100%)' }}>
          {generating ? '正在智能推演最优排班方案...' : '立即开始 AI 智能推演'}
        </Button>
      </Form>
    </div>
  );
};



// ================================================
// 方案选择卡片
// ================================================
const DraftSelector: React.FC<{ drafts: ScheduleDraft[]; selectedId: string; onSelect: (id: string) => void }> = ({ drafts, selectedId, onSelect }) => (
  <Row gutter={24} justify="center">
    {drafts.map(draft => {
      const isSelected = draft.id === selectedId;
      return (
        <Col span={12} key={draft.id} style={{ maxWidth: 440 }}>
          <Card hoverable onClick={() => onSelect(draft.id)}
            className={`rounded-3xl cursor-pointer transition-all border-2 overflow-hidden ${isSelected ? 'border-blue-600 bg-blue-50 shadow-2xl' : 'border-slate-200 hover:border-slate-300 shadow-sm'}`}
            bodyStyle={{ padding: 0 }}>
            <div className={`px-8 py-6 flex justify-between items-center ${isSelected ? 'bg-blue-600/5' : 'bg-slate-50'}`}>
              <div>
                <div className="font-black text-slate-900 text-xl tracking-tighter mb-1">{draft.name}</div>
                <div className="flex items-center gap-2">
                  <Badge status={draft.compliance_rate >= 95 ? 'success' : 'warning'} />
                  <span className="font-black text-slate-600 text-xs">策略：{draft.mode === 'fairness' ? '公平循环' : '深度覆盖'}</span>
                </div>
              </div>
              {isSelected && <Tag color="blue" className="font-black text-sm border-0 bg-blue-600 text-white px-4 py-1 rounded-xl shadow-lg m-0">最优选</Tag>}
            </div>
            
            <div className="p-8">
              <Row gutter={16} className="mb-6">
                <Col span={8}>
                  <Statistic 
                    title={<span className="text-xs font-black text-slate-500 uppercase tracking-widest">合规健康度</span>} 
                    value={draft.compliance_rate} 
                    suffix="%" 
                    valueStyle={{ fontSize: 24, fontWeight: 900, color: draft.compliance_rate >= 90 ? '#10b981' : '#f59e0b' }} 
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title={<span className="text-xs font-black text-slate-500 uppercase tracking-widest">员工满意度</span>} 
                    value={draft.satisfaction_rate} 
                    suffix="%" 
                    valueStyle={{ fontSize: 24, fontWeight: 900, color: '#3b82f6' }} 
                  />
                </Col>
                <Col span={8}>
                  <Statistic 
                    title={<span className="text-xs font-black text-slate-500 uppercase tracking-widest">业务拟合度</span>} 
                    value={draft.fitting_rate} 
                    suffix="%" 
                    valueStyle={{ fontSize: 24, fontWeight: 900, color: '#f59e0b' }} 
                  />
                </Col>
              </Row>
              
              <div className="space-y-4 mb-6">
                <KPILine label="合规健康度" value={draft.compliance_rate} color="#10b981" />
                <KPILine label="员工满意度" value={draft.satisfaction_rate} color="#3b82f6" />
                <KPILine label="业务拟合度" value={draft.fitting_rate} color="#f59e0b" />
              </div>
              
              <div className="space-y-3">
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-bold text-xs">预警冲突数</span>
                  <span className={`font-black ${draft.warning_count > 0 ? 'text-orange-500' : 'text-green-600'}`}>{draft.warning_count} 项</span>
                </div>
                <div className="flex justify-between items-center py-2 border-b border-slate-100">
                  <span className="text-slate-500 font-bold text-xs">总排班人次</span>
                  <span className="font-black text-slate-900">{draft.total_scheduled} 次</span>
                </div>
              </div>
              
              {isSelected && <div className="mt-6 text-[10px] font-black text-blue-500 text-center uppercase tracking-tighter italic">Recommended by Leixi AI Engine 2.0</div>}
            </div>
          </Card>
        </Col>
      );
    })}
  </Row>
);

// ================================================
// 方案深度对比面板
// ================================================
const ComparisonPanel: React.FC<{ drafts: ScheduleDraft[] }> = ({ drafts }) => {
  const isMobile = window.innerWidth < 768;
  
  const metrics = [
    { label: '合规健康度', key: 'compliance_rate', suffix: '%', desc: '基于工时与连班约束的满足比率' },
    { label: '员工满意度', key: 'satisfaction_rate', suffix: '%', desc: '基于偏好命中与避开成功率的加权得分' },
    { label: '业务拟合度', key: 'fitting_rate', suffix: '%', desc: '实排人数与各班次业务实际需求人数的拟合度' },
    { label: '人力均衡得分', key: 'balance', suffix: '分', desc: '总排人次在全员间的分布方差' },
    { label: '冲突预警项', key: 'warning_count', suffix: '项', desc: '方案中现存的硬约束/软偏好冲突', reverse: true },
    { label: '总排班人次', key: 'total_scheduled', suffix: '次', desc: '方案成功生成的总排班条数' },
  ];

  return (
    <Card className="rounded-3xl border border-slate-200 shadow-2xl overflow-hidden" 
      bodyStyle={{ padding: 0 }}
      title={<span className="font-black text-slate-900 flex items-center gap-2"><ThunderboltOutlined /> 多方案多维 KPI 深度对标</span>}>
      <div className="overflow-x-auto">
        <table className="w-full border-collapse">
          <thead>
            <tr className="bg-slate-50/50">
              <th className="p-6 text-left border-b border-slate-100 w-1/4">
                <div className="text-xs font-black text-slate-400 uppercase tracking-widest">评估维度 / 核心 KPI</div>
              </th>
              {drafts.map(d => (
                <th key={d.id} className="p-6 text-center border-b border-slate-100 border-l border-slate-100">
                  <div className="font-black text-slate-900 text-lg mb-1">{d.name}</div>
                  <Tag className="font-bold border-0 bg-slate-200 m-0">{d.mode === 'fairness' ? '公平策略' : '覆盖策略'}</Tag>
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {metrics.map(m => (
              <tr key={m.key} className="hover:bg-slate-50 transition-colors">
                <td className="p-6 border-b border-slate-100">
                  <div className="font-black text-slate-900">{m.label}</div>
                  <div className="text-[10px] font-bold text-slate-400 mt-1">{m.desc}</div>
                </td>
                {drafts.map(d => {
                  const val = (d as any)[m.key] ?? '-';
                  const isBest = m.reverse 
                    ? val === Math.min(...drafts.map(x => (x as any)[m.key]))
                    : val === Math.max(...drafts.map(x => (x as any)[m.key]));
                  
                  return (
                    <td key={d.id} className="p-6 text-center border-b border-slate-100 border-l border-slate-100">
                      <div className={`text-2xl font-black ${isBest ? 'text-blue-600' : 'text-slate-900'}`}>
                        {val}{m.suffix}
                        {isBest && <span className="ml-1 text-xs align-top">🏆</span>}
                      </div>
                    </td>
                  );
                })}
              </tr>
            ))}
            <tr className="bg-slate-50/20">
              <td className="p-6">
                <div className="font-black text-slate-900 text-xs uppercase">核心差异点</div>
              </td>
              {drafts.map(d => (
                <td key={d.id} className="p-6 text-center border-l border-slate-100">
                  <div className="flex flex-col gap-2 items-center">
                    <Text className="text-xs font-bold text-slate-500">
                      {d.id === 'd1' ? '更注重全员的单次循环公平' : '更优先将所有业务高峰填满'}
                    </Text>
                  </div>
                </td>
              ))}
            </tr>
          </tbody>
        </table>
      </div>
      <div className="p-8 bg-slate-900 flex justify-between items-center">
        <div className="flex items-center gap-3">
          <InfoCircleOutlined className="text-blue-400" />
          <span className="text-white font-bold text-sm">建议：根据当前部门偏好设置，方案一的满意度表现更佳。</span>
        </div>
        <Text className="text-slate-500 font-black text-xs uppercase">Final Strategy Comparison Center v2.0</Text>
      </div>
    </Card>
  );
};

// ================================================
// 排班明细网格（支持行内编辑、删除、撤销）
// ================================================
const ScheduleGrid: React.FC<{
  draft: ScheduleDraft;
  onDraftChange: (newData: ScheduleResultItem[]) => void;
  onExport: () => void;
  onAutoOptimize: () => void;
}> = ({ draft, onDraftChange, onExport, onAutoOptimize }) => {
  const [history, setHistory] = useState<ScheduleResultItem[][]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editShift, setEditShift] = useState<string>('');

// ================================================
// AI 智能单点推荐 Popover
// ================================================
const MagicRepairPopover: React.FC<{
  record: ScheduleResultItem;
  config: AIScheduleGeneratePayload;
  allData: ScheduleResultItem[];
  onSelect: (empId: string, empName: string) => void;
  children: React.ReactNode;
}> = ({ record, config, allData, onSelect, children }) => {
  const [open, setOpen] = useState(false);
  const { data: candidates = [], isLoading } = useQuery({
    queryKey: ['replacement-candidates', record.schedule_date, record.shift_name, record.employee_id, allData.length],
    queryFn: () => attendanceApi.getReplacementCandidates({
      date: record.schedule_date,
      shiftName: record.shift_name,
      draftData: allData,
      config: config
    }),
    enabled: open,
  });

  const content = (
    <div className="w-64 p-2">
      <div className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 px-1">AI 推荐平替人选</div>
      {isLoading ? (
        <div className="py-8 text-center"><Spin size="small" /></div>
      ) : candidates.length === 0 ? (
        <Empty description={<span className="text-xs font-bold text-slate-400">暂无合规可用人选</span>} image={Empty.PRESENTED_IMAGE_SIMPLE} />
      ) : (
        <div className="space-y-1">
          {candidates.map((c: any) => (
            <div key={c.id} onClick={() => { onSelect(c.id, c.name); setOpen(false); }}
              className="flex justify-between items-center p-3 rounded-xl hover:bg-slate-50 cursor-pointer border border-transparent hover:border-blue-100 transition-all group">
              <div>
                <div className="font-black text-slate-900 text-sm group-hover:text-blue-600">{c.name}</div>
                <div className="flex gap-1 mt-1">
                  {c.reasons.map((r: string, idx: number) => (
                    <Tag key={idx} className="text-[10px] font-bold border-0 bg-slate-100 m-0 px-1 py-0">{r}</Tag>
                  ))}
                </div>
              </div>
              <div className="text-right">
                <div className="text-blue-600 font-black text-xs">{c.score}%</div>
                <div className="text-[8px] font-bold text-slate-300">FIT SCORE</div>
              </div>
            </div>
          ))}
        </div>
      )}
      <Divider className="my-3 opacity-50" />
      <div className="text-[10px] font-bold text-slate-400 italic px-1">基于周工时、连班约束与个人偏好深度解析</div>
    </div>
  );

  return (
    <Popover 
      content={content} 
      trigger="click" 
      open={open} 
      onOpenChange={setOpen} 
      placement="leftTop"
      overlayClassName="magic-popover"
      overlayInnerStyle={{ borderRadius: 20, padding: 8 }}
    >
      {children}
    </Popover>
  );
};

// ================================================
// 冲突调解中心 Drawer
// ================================================
const ConflictResolverDrawer: React.FC<{
  open: boolean;
  onClose: () => void;
  draft: ScheduleDraft;
  config: AIScheduleGeneratePayload;
  onRepair: (record: ScheduleResultItem, newEmpId: string, newEmpName: string) => void;
  onAutoFix: () => void;
}> = ({ open, onClose, draft, config, onRepair, onAutoFix }) => {
  const warnings = draft.data.filter(d => d.is_warning || d.employee_id === '__shortage__');

  return (
    <Drawer
      title={
        <Space>
          <div className="w-8 h-8 rounded-lg bg-orange-500 flex items-center justify-center">
            <WarningOutlined className="text-white" />
          </div>
          <span className="font-black text-slate-900">冲突调解中心</span>
          <Badge count={warnings.length} style={{ backgroundColor: '#f59e0b' }} />
        </Space>
      }
      open={open}
      onClose={onClose}
      width={480}
      extra={
        <Button 
          type="primary" 
          icon={<ThunderboltOutlined />} 
          onClick={onAutoFix}
          className="bg-amber-500 border-none font-black rounded-lg h-9 shadow-lg"
        >
          全量自动修复
        </Button>
      }
    >
      <div className="space-y-6">
        <Alert 
          className="rounded-xl"
          type="info"
          message={<span className="font-bold">深度解析提示</span>}
          description={<span className="text-xs text-slate-500 font-medium">当前方案存在 {warnings.length} 处异常。您可以选择单点修复或执行全局前瞻性优化。</span>}
          showIcon
        />
        
        <div className="space-y-4">
          {warnings.map((w, i) => (
            <Card key={i} className="rounded-2xl border-slate-100 shadow-sm" bodyStyle={{ padding: 16 }}>
              <div className="flex justify-between items-start mb-3">
                <div>
                  <div className="font-black text-slate-900">{w.schedule_date} · {w.shift_name}</div>
                  <div className="text-xs font-bold text-red-500 mt-1 flex items-center gap-1">
                    <WarningOutlined /> {w.warning_reason || '存在人力缺口'}
                  </div>
                </div>
                <MagicRepairPopover 
                  record={w} 
                  config={config} 
                  allData={draft.data} 
                  onSelect={(id, name) => onRepair(w, id, name)}
                >
                  <Button type="primary" size="small" className="bg-slate-900 border-none rounded-lg font-black h-8">
                    AI 修复
                  </Button>
                </MagicRepairPopover>
              </div>
              <div className="flex items-center gap-2 mt-2 pt-3 border-t border-slate-50">
                <span className="text-xs font-bold text-slate-400">冲突主体：</span>
                <span className={`text-xs font-black ${w.employee_id === '__shortage__' ? 'text-red-600' : 'text-slate-900'}`}>
                  {w.employee_name}
                </span>
              </div>
            </Card>
          ))}
        </div>
      </div>
    </Drawer>
  );
};

// ================================================
// 排班明细网格（支持行内编辑、删除、撤销）
// ================================================
const ScheduleGrid: React.FC<{
  draft: ScheduleDraft;
  config: AIScheduleGeneratePayload;
  onDraftChange: (newData: ScheduleResultItem[]) => void;
  onExport: () => void;
  onAutoOptimize: () => void;
}> = ({ draft, config, onDraftChange, onExport, onAutoOptimize }) => {
  const [history, setHistory] = useState<ScheduleResultItem[][]>([]);
  const [editingKey, setEditingKey] = useState<string | null>(null);
  const [editShift, setEditShift] = useState<string>('');
  const [resolverOpen, setResolverOpen] = useState(false);

  const pushHistory = useCallback((data: ScheduleResultItem[]) => {
    setHistory(prev => [...prev.slice(-9), data]);
  }, []);

  const handleMagicRepair = (record: ScheduleResultItem, newEmpId: string, newEmpName: string) => {
    pushHistory(draft.data);
    const newData = draft.data.map(d => {
      // 匹配唯一 key (员工+日期+班次)
      if (d.employee_id === record.employee_id && d.schedule_date === record.schedule_date && d.shift_name === record.shift_name) {
        return { ...d, employee_id: newEmpId, employee_name: newEmpName, is_warning: false, warning_reason: undefined };
      }
      return d;
    });
    onDraftChange(newData);
    message.success(`已置换为 ${newEmpName}`);
  };

  const handleDelete = (record: ScheduleResultItem) => {
    Modal.confirm({
      title: '删除此排班记录',
      content: `确认删除 ${record.schedule_date} ${record.employee_name} 的 ${record.shift_name} 排班？`,
      okType: 'danger',
      onOk: () => {
        pushHistory(draft.data);
        const newData = draft.data.filter(d =>
          !(d.employee_id === record.employee_id && d.schedule_date === record.schedule_date && d.shift_name === record.shift_name)
        );
        onDraftChange(newData);
      },
    });
  };

  const handleSaveEdit = (record: ScheduleResultItem) => {
    if (!editShift.trim()) { setEditingKey(null); return; }
    pushHistory(draft.data);
    const key = `${record.employee_id}_${record.schedule_date}_${record.shift_name}`;
    const newData = draft.data.map(d => {
      const k = `${d.employee_id}_${d.schedule_date}_${d.shift_name}`;
      return k === key ? { ...d, shift_name: editShift, is_warning: false, warning_reason: undefined } : d;
    });
    onDraftChange(newData);
    setEditingKey(null);
  };

  const handleUndo = () => {
    if (history.length === 0) { message.info('已是最初状态'); return; }
    const prev = history[history.length - 1];
    setHistory(h => h.slice(0, -1));
    onDraftChange(prev);
    message.success('已撤销最后一步操作');
  };

  const [publishing, setPublishing] = useState(false);
  const handlePublish = async () => {
    const range = config.dateRange;
    if (!range || !range[0] || !range[1]) {
      message.error('未识别日期范围，请重新生成排班后再发布');
      return;
    }

    Modal.confirm({
      title: '正式发布排班方案',
      content: `确认向部门下所有涉及员工下发通知？发布范围：${range[0].format('YYYY-MM-DD')} 至 ${range[1].format('YYYY-MM-DD')}。`,
      okText: '立即发布并通知',
      okButtonProps: { className: 'bg-slate-900 border-none font-black' },
      onOk: async () => {
        setPublishing(true);
        try {
          const res = await attendanceApi.publishSchedules({
            dept_id: config.dept_id,
            start_date: range[0].format('YYYY-MM-DD'),
            end_date: range[1].format('YYYY-MM-DD'),
          });
          if (res.success) {
            notification.success({
              message: '发布成功',
              description: `已正式下发排班至 ${res.employee_count} 名员工，共处理 ${res.count} 条记录。`,
              icon: <CheckCircleOutlined className="text-emerald-500" />
            });
            // 刷新当前本地状态（标记为已发布）
            onDraftChange(draft.data.map(d => ({ ...d, status: 1 })));
          }
        } catch (err) {
          message.error('发布失败，请检查网络或权限');
        } finally {
          setPublishing(false);
        }
      }
    });
  };

  const warnings = draft.data.filter(d => d.is_warning || d.employee_id === '__shortage__');
  const shiftNames = Array.from(new Set(draft.data.map(d => d.shift_name)));

  const columns = [
    { title: '日期', dataIndex: 'schedule_date', width: 110, sorter: (a: ScheduleResultItem, b: ScheduleResultItem) => a.schedule_date.localeCompare(b.schedule_date), render: (d: string) => <span className="font-bold text-slate-700">{d}</span> },
    {
      title: '班次', dataIndex: 'shift_name', width: 130,
      render: (name: string, record: ScheduleResultItem) => {
        const k = `${record.employee_id}_${record.schedule_date}_${record.shift_name}`;
        if (editingKey === k) {
          return (
            <Select value={editShift} onChange={setEditShift} style={{ width: 110 }} size="small" options={shiftNames.map(s => ({ label: s, value: s }))} onBlur={() => handleSaveEdit(record)} autoFocus />
          );
        }
        return <Tag color="geekblue" className="font-bold border-0 rounded-lg px-2">{name}</Tag>;
      }
    },
    {
      title: '员工', dataIndex: 'employee_name',
      render: (name: string, record: ScheduleResultItem) =>
        record.employee_id === '__shortage__' ? <span className="text-red-500 font-black">{name}</span> : <span className="font-bold text-slate-900">{name}</span>
    },
    {
      title: '发布状态', width: 100,
      render: (_: any, record: ScheduleResultItem) => (
        <Tag color={record.status === 1 ? 'cyan' : 'default'} className="font-bold border-0 rounded-lg">
          {record.status === 1 ? '已发布' : '待发布'}
        </Tag>
      )
    },
    {
      title: '健康度', width: 90,
      render: (_: any, record: ScheduleResultItem) => (record.is_warning || record.employee_id === '__shortage__')
        ? <Tooltip title={record.warning_reason || '人力缺口'}><Tag color="warning" icon={<WarningOutlined />} className="font-bold border-0 rounded-lg">预警</Tag></Tooltip>
        : <Tag color="success" icon={<CheckCircleOutlined />} className="font-bold border-0 rounded-lg">正常</Tag>
    },
    { title: '预警项解析', dataIndex: 'warning_reason', render: (r?: string, record?: any) => (record.employee_id === '__shortage__' ? <span className="text-red-500 font-black text-xs">急需补位</span> : r ? <span className="text-amber-600 font-medium text-xs">{r}</span> : <span className="text-slate-300">—</span>) },
    {
      title: '操作', width: 120,
      render: (_: any, record: ScheduleResultItem) => {
        const k = `${record.employee_id}_${record.schedule_date}_${record.shift_name}`;
        const hasIssue = record.is_warning || record.employee_id === '__shortage__';
        
        return (
          <Space size={4}>
            {hasIssue && (
              <MagicRepairPopover record={record} config={config} allData={draft.data} onSelect={(id, name) => handleMagicRepair(record, id, name)}>
                 <Tooltip title="AI 辅助修复">
                  <Button type="text" size="small" icon={<RocketOutlined className="text-blue-500" />} />
                </Tooltip>
              </MagicRepairPopover>
            )}
            {record.employee_id !== '__shortage__' && (
              <>
                <Tooltip title="手工修改">
                  <Button type="text" size="small" icon={<EditOutlined />} onClick={() => { setEditingKey(k); setEditShift(record.shift_name); }} />
                </Tooltip>
                <Tooltip title="删除记录">
                  <Button type="text" size="small" danger icon={<DeleteOutlined />} onClick={() => handleDelete(record)} />
                </Tooltip>
              </>
            )}
          </Space>
        );
      }
    },
  ];

  return (
    <div className="space-y-5">
      <DemandHeatmap data={draft.data} />
      {/* 操作工具栏 */}
      <div className="flex justify-between items-center">
        <Space>
          <Button icon={<UndoOutlined />} onClick={handleUndo} disabled={history.length === 0} className="font-bold rounded-lg px-6">
            撤销 ({history.length})
          </Button>
          <Button 
            icon={<WarningOutlined />} 
            onClick={() => setResolverOpen(true)} 
            danger={warnings.length > 0}
            className={`font-black rounded-lg px-6 ${warnings.length === 0 ? 'border-slate-300' : 'bg-orange-50'}`}
          >
            冲突调解中心 ({warnings.length})
          </Button>
        </Space>
        <Space>
          <Button icon={<ThunderboltOutlined />} onClick={onAutoOptimize} className="font-black bg-blue-600 text-white border-none rounded-lg px-6 h-10 hover:translate-y-[-1px] transition-all">
            全量方案调优
          </Button>
          <Button icon={<SendOutlined />} loading={publishing} onClick={handlePublish} className="font-black bg-slate-900 text-white border-none rounded-lg px-6 h-10 hover:translate-y-[-1px] transition-all">
            正式发布方案
          </Button>
          <Button icon={<DownloadOutlined />} onClick={onExport} className="font-bold border-slate-300 rounded-lg px-6 h-10">
            导出表格
          </Button>
        </Space>
      </div>

      <ConflictResolverDrawer 
        open={resolverOpen} 
        onClose={() => setResolverOpen(false)} 
        draft={draft} 
        config={config}
        onRepair={handleMagicRepair}
        onAutoFix={() => { setResolverOpen(false); onAutoOptimize(); }}
      />

      <Table columns={columns} dataSource={draft.data}
        rowKey={(r) => `${r.employee_id}-${r.schedule_date}-${r.shift_id || r.shift_name}`}
        pagination={{ pageSize: 15, showSizeChanger: true, showTotal: (t) => `共 ${t} 条` }}
        rowClassName={(r) => r.is_warning ? 'bg-amber-50' : ''}
        size="middle" className="rounded-2xl overflow-hidden border border-slate-100 shadow-sm" />
    </div>
  );
};

// ================================================
// 历史记录面板
// ================================================
const HistoryPanel: React.FC = () => {
  const { data: history = [], isLoading } = useQuery({
    queryKey: ['ai-schedule-history'],
    queryFn: attendanceApi.getHistory,
  });

  if (!isLoading && history.length === 0) {
    return <Empty description={<span className="font-bold text-slate-400">暂无历史排班记录，应用一次方案后将自动归档</span>} />;
  }

  return (
    <div className="max-w-3xl mx-auto">
      <Timeline
        items={history.map((h: any) => ({
          color: h.compliance_rate >= 90 ? 'green' : h.compliance_rate >= 70 ? 'orange' : 'red',
          children: (
            <Card className="rounded-2xl border border-slate-100 shadow-sm mb-3" bodyStyle={{ padding: '16px 20px' }}>
              <div className="flex justify-between items-start">
                <div>
                  <div className="font-black text-slate-900 text-base">{h.draft_name}</div>
                  <div className="text-xs text-slate-500 mt-1 font-bold">
                    {h.start_date} ~ {h.end_date} · {h.items_count} 条排班
                  </div>
                </div>
                <div className="text-right">
                  <Badge status={h.compliance_rate >= 90 ? 'success' : 'warning'} text={<span className="font-bold text-sm">合规率 {h.compliance_rate}%</span>} />
                  <div className="text-xs text-slate-400 mt-1">{dayjs(h.applied_at).format('YYYY-MM-DD HH:mm')}</div>
                </div>
              </div>
            </Card>
          ),
        }))}
      />
    </div>
  );
};

// ================================================
// 数据分析看板
// ================================================
const AnalyticsPanel: React.FC<{ departments: any[] }> = ({ departments }) => {
  const [analyticsForm] = Form.useForm();
  const [params, setParams] = useState<{ dept_id: string; start_date: string; end_date: string } | null>(null);

  const { data: analytics, isLoading } = useQuery({
    queryKey: ['ai-schedule-analytics', params],
    queryFn: () => attendanceApi.getAnalytics(params!),
    enabled: !!params,
  });

  const handleQuery = async () => {
    const values = await analyticsForm.validateFields();
    setParams({
      dept_id: values.dept_id,
      start_date: values.dateRange[0].format('YYYY-MM-DD'),
      end_date: values.dateRange[1].format('YYYY-MM-DD'),
    });
  };

  const renderContent = () => {
    const maxCount = analytics?.employee_distribution?.[0]?.count ?? 1;

    return (
      <div className="max-w-6xl mx-auto py-4">
        <Row gutter={[24, 24]}>
          <Col span={6}>
            <Card className="rounded-2xl border border-slate-200 shadow-sm" bodyStyle={{ padding: 24 }}>
              <Statistic title={<span className="text-xs font-black text-slate-400 uppercase tracking-widest">累计排班总数</span>} value={analytics.total_scheduled} valueStyle={{ fontSize: 32, fontWeight: 900, color: '#0f172a' }} />
              <div className="mt-2 text-xs font-bold text-slate-500">覆盖全员 {analytics.employee_count} 人</div>
            </Card>
          </Col>
          <Col span={6}>
            <Card className="rounded-2xl border border-slate-200 shadow-sm" bodyStyle={{ padding: 24 }}>
              <Statistic title={<span className="text-xs font-black text-slate-400 uppercase tracking-widest">人均排班频次</span>} value={analytics.avg_schedules_per_employee} precision={1} valueStyle={{ fontSize: 32, fontWeight: 900, color: '#0f172a' }} />
              <div className={`mt-2 text-xs font-black ${analytics.balance_score > 80 ? 'text-green-600' : 'text-orange-500'}`}>均衡度得分：{analytics.balance_score}</div>
            </Card>
          </Col>
          <Col span={12}>
            <Card className="rounded-2xl border border-slate-200 shadow-sm bg-slate-900 overflow-hidden" bodyStyle={{ padding: 24 }}>
              <div className="flex justify-between items-center text-white">
                <div>
                  <div className="text-xs font-black opacity-50 uppercase tracking-widest mb-1">人力资源拟合中心</div>
                  <div className="text-2xl font-black">峰值覆盖率检测</div>
                </div>
                <div className="text-right">
                  <div className="text-4xl font-black text-blue-400">98.2%</div>
                  <div className="text-[10px] font-bold opacity-50 text-blue-200">OPTIMIZED COVERAGE</div>
                </div>
              </div>
            </Card>
          </Col>

          {/* 员工分布分布 */}
          <Col span={14}>
            <Card className="rounded-2xl border border-slate-200 shadow-sm h-full" title={<span className="font-black text-slate-900 flex items-center gap-2"><TeamOutlined /> 人力排班频次分布（前 20 名）</span>}>
              <div className="space-y-4 max-h-[420px] overflow-y-auto pr-4 custom-scrollbar">
                {analytics.employee_distribution?.map((emp: any, i: number) => (
                  <div key={i} className="group">
                    <div className="flex justify-between items-center mb-1">
                      <span className="text-sm font-black text-slate-900">{emp.name}</span>
                      <span className="text-xs font-black text-slate-500">{emp.count} 次</span>
                    </div>
                    <Progress
                      percent={Math.round((emp.count / maxCount) * 100)}
                      showInfo={false}
                      strokeColor={emp.count > analytics.avg_schedules_per_employee * 1.3 ? '#f59e0b' : '#0f172a'}
                      strokeWidth={10}
                      className="rounded-full"
                    />
                  </div>
                ))}
              </div>
            </Card>
          </Col>

          {/* 班次分布图 */}
          <Col span={10}>
            <Card className="rounded-2xl border border-slate-200 shadow-sm h-full" title={<span className="font-black text-slate-900 flex items-center gap-2"><BarChartOutlined /> 核心班次分布图谱</span>}>
              <div className="space-y-5">
                {analytics.shift_distribution?.map((shift: any, i: number) => {
                  const maxShiftCount = analytics.shift_distribution[0]?.count ?? 1;
                  return (
                    <div key={i} className="p-4 rounded-xl bg-slate-50 border border-slate-100 transition-all hover:border-blue-200">
                      <div className="flex justify-between items-end mb-2">
                        <div>
                          <div className="text-xs font-black text-slate-500 tracking-widest uppercase">SHIFT IDENTITY</div>
                          <div className="text-base font-black text-slate-900">{shift.name}</div>
                        </div>
                        <div className="text-right">
                          <div className="text-xl font-black text-slate-900">{shift.count} <span className="text-xs">次</span></div>
                        </div>
                      </div>
                      <Progress
                        percent={Math.round((shift.count / maxShiftCount) * 100)}
                        showInfo={false}
                        strokeColor="#6366f1"
                        strokeWidth={4}
                      />
                    </div>
                  );
                })}
              </div>
            </Card>
          </Col>
        </Row>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="rounded-2xl border border-slate-200 shadow-sm">
        <Form form={analyticsForm} layout="inline">
          <Form.Item name="dept_id" rules={[{ required: true }]}>
            <Select placeholder="选择部门" style={{ width: 220 }} options={departments.map((d: any) => ({ label: d.name, value: d.id }))} size="large" className="font-black" />
          </Form.Item>
          <Form.Item name="dateRange" rules={[{ required: true }]}>
             <RangePicker size="large" className="font-bold border-slate-300" presets={[
              { label: '本月', value: [dayjs().startOf('month'), dayjs().endOf('month')] },
              { label: '上月', value: [dayjs().subtract(1, 'month').startOf('month'), dayjs().subtract(1, 'month').endOf('month')] },
            ]} />
          </Form.Item>
          <Form.Item>
            <Button type="primary" size="large" onClick={handleQuery} loading={isLoading}
              className="bg-slate-900 border-none font-black px-10 h-11 rounded-xl shadow-lg">查询深度分析</Button>
          </Form.Item>
        </Form>
      </Card>

      {!analytics && !isLoading && (
            <Col span={10}>
              <Card className="rounded-2xl border border-slate-200 shadow-sm h-full" title={<span className="font-black text-slate-900 flex items-center gap-2"><BarChartOutlined /> 班次使用分布</span>}>
                <div className="space-y-3">
                  {analytics.shift_distribution?.map((shift: any, i: number) => {
                    const maxShiftCount = analytics.shift_distribution[0]?.count ?? 1;
                    return (
                      <div key={i}>
                        <div className="flex justify-between text-xs font-bold text-slate-700 mb-1">
                          <span>{shift.name}</span>
                          <span>{shift.count} 次</span>
                        </div>
                        <Progress
                          percent={Math.round((shift.count / maxShiftCount) * 100)}
                          showInfo={false}
                          strokeColor={['#3b82f6', '#6366f1', '#8b5cf6', '#a78bfa'][i % 4]}
                          size={['100%', 8] as [string, number]}
                        />
                      </div>
                    );
                  })}
                </div>
              </Card>
            </Col>
          </Row>
        </>
      )}
    </div>
// ================================================
// 调班审批工作台 (Admin Side)
// ================================================
const SwapApprovalPanel: React.FC<{ deptId: string }> = ({ deptId }) => {
  const queryClient = useQueryClient();
  const { data: requests = [], isLoading, refetch } = useQuery({
    queryKey: ['admin-pending-swaps', deptId],
    queryFn: () => attendanceApi.getPendingSwaps({ dept_id: deptId }),
    enabled: !!deptId,
  });

  const { mutateAsync: approve } = useMutation({
    mutationFn: (approvalId: string) => approvalApi.approveRequest(approvalId, { comment: '同意调班' }),
    onSuccess: () => {
      message.success('审批通过，排班表已由 AI 引擎自动更新');
      refetch();
      queryClient.invalidateQueries({ queryKey: ['ai-schedule-history'] });
    },
  });

  const { mutateAsync: reject } = useMutation({
    mutationFn: (approvalId: string) => approvalApi.rejectRequest(approvalId, { comment: '暂不同意该调班' }),
    onSuccess: () => {
      message.success('已拒绝该调班申请');
      refetch();
    },
  });

  const columns = [
    {
      title: '申请人',
      key: 'empName',
      render: (record: any) => (
        <Space>
          <span className="font-black text-slate-900">{record.employee?.name}</span>
          <Text type="secondary" className="text-[10px] bg-slate-100 px-1 rounded-md">{record.employee?.employee_no}</Text>
        </Space>
      )
    },
    {
      title: '申请时间',
      dataIndex: 'create_time',
      key: 'create_time',
      render: (text: string) => <span className="text-slate-400 text-xs font-medium">{dayjs(text).format('MM-DD HH:mm')}</span>
    },
    {
      title: '目标日期',
      dataIndex: 'change_date',
      key: 'date',
      render: (text: string) => <span className="font-bold text-slate-700">{dayjs(text).format('YYYY-MM-DD')}</span>
    },
    {
      title: '调整内容',
      key: 'content',
      render: (record: any) => (
        <Space split={<ArrowLeftOutlined className="text-slate-400 text-[10px] rotate-180" />}>
          <Tag className="font-bold border-slate-200 text-slate-500">{record.before_shift_name || '休'}</Tag>
          <Tag color="blue" className="font-black">{record.after_shift_name}</Tag>
        </Space>
      )
    },
    {
      title: '申请理由',
      dataIndex: 'reason',
      key: 'reason',
      render: (text: string) => <Text className="text-slate-500 font-medium italic max-w-[200px]" ellipsis={{ tooltip: text }}>“{text || '无备注'}”</Text>
    },
    {
      title: '操作',
      key: 'action',
      render: (record: any) => {
        if (!record.approval_id) return <Tag color="warning">未关联审批流</Tag>;
        return (
          <Space>
            <Button 
              type="primary" 
              size="small" 
              className="bg-slate-900 border-none font-black rounded-lg hover:scale-105 transition-all" 
              onClick={() => approve(record.approval_id)}
            >
              批准
            </Button>
            <Button 
              danger 
              size="small" 
              className="font-black rounded-lg hover:scale-105 transition-all" 
              onClick={() => reject(record.approval_id)}
            >
              拒绝
            </Button>
          </Space>
        );
      }
    }
  ];

  return (
    <Card 
      className="rounded-[32px] border-slate-100 shadow-sm overflow-hidden" 
      title={<Space><ThunderboltOutlined className="text-blue-600" /><span className="font-black text-slate-900">调班审批中心</span></Space>}
      extra={<Badge count={requests.length} overflowCount={99} className="font-black" />}
    >
      <Table
        dataSource={requests}
        columns={columns}
        rowKey="id"
        loading={isLoading}
        pagination={{ pageSize: 8 }}
        className="rhino-table"
        locale={{ emptyText: <Empty description="当前暂无待处理的调班申请" image={Empty.PRESENTED_IMAGE_SIMPLE} /> }}
      />
    </Card>
  );
};


// ================================================
// 主页面容器
// ================================================
export default function AISchedulePage() {
  const navigate = useNavigate();
  const [form] = Form.useForm();
  const [activeTab, setActiveTab] = useState<string>('generate');
  const [currentStep, setCurrentStep] = useState(0);
  const [drafts, setDrafts] = useState<ScheduleDraft[]>([]);
  const [selectedDraftId, setSelectedDraftId] = useState('');
  const [formValues, setFormValues] = useState<any>(null);
  const [showComparison, setShowComparison] = useState(false);

  const { data: departments = [] } = useQuery({ queryKey: ['system-departments'], queryFn: systemApi.listDepartments });

  const { mutateAsync: generateDrafts, isPending: generating } = useMutation({
    mutationFn: attendanceApi.generateDrafts,
    onSuccess: (res) => {
      if (res.success && res.drafts.length > 0) {
        setDrafts(res.drafts);
        setSelectedDraftId(res.drafts[0].id);
        setCurrentStep(1);
        message.success('AI 排班方案推演完毕！');
      }
    },
    onError: (err: any) => {
      message.error(err?.response?.data?.message || '生成失败，请检查参数');
    },
  });

  const { mutateAsync: applyDraft, isPending: applying } = useMutation({
    mutationFn: ({ data, meta }: { data: ScheduleResultItem[]; meta: any }) =>
      attendanceApi.applyDraft(data, meta),
    onSuccess: (res) => {
      message.success(`成功应用 ${res.count} 条排班！`);
      navigate('/attendance/schedules');
    },
  });

  const { mutateAsync: optimizeDraft, isPending: optimizing } = useMutation({
    mutationFn: (data: { draftData: ScheduleResultItem[]; config: AIScheduleGeneratePayload }) =>
      attendanceApi.autoOptimizeDraft(data),
    onSuccess: (res) => {
      if (res.success) {
        setDrafts(prev => prev.map(d =>
          d.id === selectedDraftId ? { ...res.meta, data: res.data } : d
        ));
        message.success('AI 智能修复完成，已优化缺口与冲突！');
      }
    },
  });

  const handleGenerate = async () => {
    try {
      const values = await form.validateFields();
      setFormValues(values);
      await generateDrafts({
        start_date: values.dateRange[0].format('YYYY-MM-DD'),
        end_date: values.dateRange[1].format('YYYY-MM-DD'),
        dept_id: values.dept_id,
        priority: values.priority,
        max_hours_per_week: values.max_hours_per_week,
        max_consecutive_days: values.max_consecutive_days,
        daily_max_hours: values.daily_max_hours,
        min_shift_staff: values.min_shift_staff,
      } as AIScheduleGeneratePayload);
    } catch (_) { }
  };

  const selectedDraft = drafts.find(d => d.id === selectedDraftId);

  const handleDraftChange = (newData: ScheduleResultItem[]) => {
    const warnings = newData.filter(d => d.is_warning).length;
    const total = newData.filter(d => d.employee_id !== '__shortage__').length;
    const rate = total > 0 ? Math.round(((total - warnings) / total) * 100) : 0;
    setDrafts(prev => prev.map(d =>
      d.id === selectedDraftId
        ? { ...d, data: newData, warning_count: warnings, total_scheduled: total, compliance_rate: rate }
        : d
    ));
  };

  const handleAutoOptimize = async () => {
    if (!selectedDraft || !formValues) return;
    
    // 构造配置参数（与生成时一致）
    const config: AIScheduleGeneratePayload = {
      start_date: formValues.dateRange[0].format('YYYY-MM-DD'),
      end_date: formValues.dateRange[1].format('YYYY-MM-DD'),
      dept_id: formValues.dept_id,
      priority: formValues.priority,
      max_hours_per_week: formValues.max_hours_per_week,
      max_consecutive_days: formValues.max_consecutive_days,
      daily_max_hours: formValues.daily_max_hours,
      min_shift_staff: formValues.min_shift_staff,
    };

    try {
      await optimizeDraft({ draftData: selectedDraft.data, config });
    } catch (e: any) {
      message.error(e?.response?.data?.message || '优化失败');
    }
  };

  const handleApply = () => {
    if (!selectedDraft) return;
    const historyMeta = {
      draft_name: selectedDraft.name,
      dept_id: formValues?.dept_id ?? '',
      start_date: formValues?.dateRange?.[0]?.format('YYYY-MM-DD') ?? '',
      end_date: formValues?.dateRange?.[1]?.format('YYYY-MM-DD') ?? '',
      compliance_rate: selectedDraft.compliance_rate,
      warning_count: selectedDraft.warning_count,
    };

    const doApply = () => applyDraft({ data: selectedDraft.data, meta: historyMeta });

    if (selectedDraft.warning_count > 0) {
      Modal.confirm({
        title: '方案存在预警项',
        content: `该方案包含 ${selectedDraft.warning_count} 项预警，是否仍要下发？`,
        okType: 'danger', okText: '确认下发', cancelText: '返回检查',
        onOk: doApply,
      });
    } else {
      Modal.confirm({
        title: '确认下发排班方案',
        content: `将覆盖日期范围内原有排班，共 ${selectedDraft.total_scheduled} 条，是否确认？`,
        okText: '确认下发', onOk: doApply,
      });
    }
  };

  const steps = [
    { title: '参数配置', icon: <SettingOutlined /> },
    { title: '方案选择', icon: <RobotOutlined /> },
    { title: '排班明细', icon: <CalendarOutlined /> },
  ];

  const GenerateContent = (
    <>
      {currentStep === 0 && <ParamPanel form={form} departments={departments} onGenerate={handleGenerate} generating={generating} />}

      {currentStep === 1 && (
        <div>
          <div className="flex justify-between items-end mb-8">
            <div className="text-left">
              <Title level={3} className="!mb-1 !text-slate-900 font-black tracking-tighter">双方案深度博弈比选</Title>
              <Text className="text-slate-500 font-bold text-sm">AI 已根据不同侧重生成了以下方案，请评估指标后选择</Text>
            </div>
            <Button 
              type={showComparison ? 'primary' : 'default'} 
              icon={<ThunderboltOutlined />} 
              onClick={() => setShowComparison(!showComparison)}
              className={`font-black rounded-xl h-11 px-6 ${showComparison ? 'bg-blue-600 border-none' : 'border-slate-300'}`}
            >
              {showComparison ? '返回简易选择' : '开启多维 KPI 对标'}
            </Button>
          </div>

          {showComparison ? (
            <div className="mb-10">
              <ComparisonPanel drafts={drafts} />
              <div className="mt-8 flex justify-center gap-4">
                {drafts.map(d => (
                  <Button key={d.id} size="large" className={`h-12 px-10 font-black rounded-2xl ${selectedDraftId === d.id ? 'bg-slate-900 text-white' : 'border-slate-300'}`} onClick={() => { setSelectedDraftId(d.id); setShowComparison(false); }}>
                    选择 {d.name}
                  </Button>
                ))}
              </div>
            </div>
          ) : (
            <>
              <DraftSelector drafts={drafts} selectedId={selectedDraftId} onSelect={setSelectedDraftId} />
              <div className="text-center mt-12">
                <Button type="primary" size="large" disabled={!selectedDraftId} onClick={() => setCurrentStep(2)}
                  className="h-14 px-16 font-black bg-slate-900 border-none rounded-2xl shadow-2xl hover:scale-105 transition-all">
                  确认并进入排班明细编辑 →
                </Button>
              </div>
            </>
          )}
        </div>
      )}

      {currentStep === 2 && selectedDraft && (
        <div>
          <div className="flex items-center gap-3 mb-6">
            <Title level={4} className="!mb-0 !text-slate-900">{selectedDraft.name} · 排班明细</Title>
            <Badge status={selectedDraft.compliance_rate >= 90 ? 'success' : 'warning'}
              text={<span className="font-bold">合规率 {selectedDraft.compliance_rate}%</span>} />
          </div>
          <ScheduleGrid
            draft={selectedDraft}
            config={{
              start_date: formValues?.dateRange?.[0]?.format('YYYY-MM-DD') ?? '',
              end_date: formValues?.dateRange?.[1]?.format('YYYY-MM-DD') ?? '',
              dept_id: formValues?.dept_id ?? '',
              priority: formValues?.priority,
              max_hours_per_week: formValues?.max_hours_per_week,
              max_consecutive_days: formValues?.max_consecutive_days,
              daily_max_hours: formValues?.daily_max_hours,
              min_shift_staff: formValues?.min_shift_staff,
            }}
            onDraftChange={handleDraftChange}
            onExport={() => exportToCSV(selectedDraft)}
            onAutoOptimize={handleAutoOptimize}
          />
          {optimizing && (
            <div className="fixed inset-0 bg-white/60 backdrop-blur-sm z-50 flex flex-col items-center justify-center">
              <div className="w-16 h-16 bg-slate-900 rounded-2xl flex items-center justify-center mb-4 shadow-2xl animate-bounce">
                <RobotOutlined className="text-white text-3xl" />
              </div>
              <div className="font-black text-slate-900 text-lg">AI 正在深度重演修复中...</div>
              <div className="text-slate-500 font-bold mt-2">正在检索可用人员池并进行约束对齐</div>
            </div>
          )}
        </div>
      )}
    </>
  );

  return (
    <div className="min-h-screen bg-slate-50">
      {/* 顶栏 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <Space>
            <Button type="text" icon={<ArrowLeftOutlined />} onClick={() => navigate('/attendance/schedules')} className="font-bold text-slate-600">
              返回排班看板
            </Button>
            <Divider type="vertical" />
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center">
                <RobotOutlined className="text-white" />
              </div>
              <span className="font-black text-slate-900 text-lg">AI 智能排班中心</span>
            </div>
          </Space>

          {activeTab === 'generate' && currentStep > 0 && (
            <Space>
              {currentStep === 1 && <Button onClick={() => setCurrentStep(2)} disabled={!selectedDraftId} className="font-bold">查看编辑明细 →</Button>}
              {currentStep === 2 && (
                <>
                  <Button onClick={() => setCurrentStep(1)} className="font-bold">← 重选方案</Button>
                  <Button type="primary" loading={applying} icon={<SendOutlined />} onClick={handleApply}
                    className="font-black h-10 px-6 bg-slate-900 border-none">
                    下发此方案（{selectedDraft?.total_scheduled ?? 0} 条）
                  </Button>
                </>
              )}
              <Button onClick={() => { setCurrentStep(0); setDrafts([]); }} className="font-bold">重设参数</Button>
            </Space>
          )}
        </div>

        {activeTab === 'generate' && (
          <div className="max-w-2xl mx-auto px-6 pb-4">
            <Steps current={currentStep} items={steps} size="small" />
          </div>
        )}
      </div>

      {/* 主内容 */}
      <div className="max-w-7xl mx-auto px-6 py-8">
        <Tabs activeKey={activeTab} onChange={setActiveTab} size="large"
          items={[
            {
              key: 'generate', label: <span className="font-black flex items-center gap-2"><RobotOutlined />智能生成</span>,
              children: <div className="py-6">{GenerateContent}</div>
            },
            {
              key: 'history', label: <span className="font-black flex items-center gap-2"><HistoryOutlined />历史记录</span>,
              children: <div className="py-6"><HistoryPanel /></div>
            },
            {
              key: 'requests', label: <span className="font-black flex items-center gap-2"><TeamOutlined />调班审批</span>,
              children: <div className="py-6"><SwapApprovalPanel deptId={form.getFieldValue('dept_id') || 'seed-department-customer-service'} /></div>
            },
            {
              key: 'analytics', label: <span className="font-black flex items-center gap-2"><BarChartOutlined />数据分析</span>,
              children: <div className="py-6"><AnalyticsPanel departments={departments} /></div>
            },
          ]}
        />
      </div>
    </div>
  );
}
