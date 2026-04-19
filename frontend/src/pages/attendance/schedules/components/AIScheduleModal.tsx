import { Modal, Form, DatePicker, Select, Radio, InputNumber, Button, Spin, Tag, Space, Result } from 'antd';
import { useState } from 'react';
import type { Dayjs } from 'dayjs';
import dayjs from 'dayjs';
import { useQuery, useMutation } from '@tanstack/react-query';
import { attendanceApi } from '@/api/attendance';
import { systemApi } from '@/api/system';

const { RangePicker } = DatePicker;

interface AIScheduleModalProps {
  open: boolean;
  onCancel: () => void;
  onSuccess: () => void;
}

export const AIScheduleModal = ({ open, onCancel, onSuccess }: AIScheduleModalProps) => {
  const [form] = Form.useForm();
  const [step, setStep] = useState(0);
  const [drafts, setDrafts] = useState<any[]>([]);
  const [selectedDraftIndex, setSelectedDraftIndex] = useState(0);

  const { data: departments = [] } = useQuery({
    queryKey: ['system-departments'],
    queryFn: systemApi.listDepartments,
  });

  const { mutateAsync: generateDrafts, isPending: generating } = useMutation({
    mutationFn: (data: Parameters<typeof attendanceApi.generateDrafts>[0]) => attendanceApi.generateDrafts(data),
    onSuccess: (res) => {
      if (res.success) {
        setDrafts(res.drafts);
        setStep(1);
      }
    }
  });

  const { mutateAsync: applyDraft, isPending: applying } = useMutation({
    mutationFn: attendanceApi.applyDraft,
    onSuccess: () => {
      onSuccess();
    }
  });

  const handleGenerate = async () => {
    const values = await form.validateFields();
    await generateDrafts({
      start_date: values.dateRange[0].format('YYYY-MM-DD'),
      end_date: values.dateRange[1].format('YYYY-MM-DD'),
      dept_id: values.dept_id,
      priority: values.priority,
      max_hours_per_week: values.max_hours_per_week
    });
  };

  const handleApply = async () => {
    const selectedDraft = drafts[selectedDraftIndex];
    if (selectedDraft) {
      await applyDraft(selectedDraft.data);
    }
  };

  return (
    <Modal
      title="AI 智能排班"
      open={open}
      onCancel={onCancel}
      width={700}
      footer={
        step === 0 ? (
          <Space>
            <Button onClick={onCancel}>取消</Button>
            <Button type="primary" onClick={handleGenerate} loading={generating} className="bg-blue-600">
              开始生成方案
            </Button>
          </Space>
        ) : (
          <Space>
            <Button onClick={() => setStep(0)}>重设参数</Button>
            <Button type="primary" onClick={handleApply} loading={applying} className="bg-slate-900 font-bold">
              采用并下发此方案 (共 {drafts[selectedDraftIndex]?.data.length} 条)
            </Button>
          </Space>
        )
      }
    >
      {step === 0 && (
        <Form form={form} layout="vertical" className="mt-4" initialValues={{ priority: 'coverage', max_hours_per_week: 40 }}>
          <Form.Item name="dept_id" label="目标部门" rules={[{ required: true }]}>
             <Select placeholder="选择需要智能生成的业务部门" options={departments.map((d: any) => ({ label: d.name, value: d.id }))} />
          </Form.Item>
          <Form.Item name="dateRange" label="计划执行周期" rules={[{ required: true }]}>
             <RangePicker className="w-full" disabledDate={current => current && current < dayjs().startOf('day')} />
          </Form.Item>
          <Form.Item name="priority" label="算法优化倾向">
             <Radio.Group>
               <Radio.Button value="coverage">覆盖率优先（保障业务）</Radio.Button>
               <Radio.Button value="fairness">公平性优先（休息均沾）</Radio.Button>
             </Radio.Group>
          </Form.Item>
          <Form.Item name="max_hours_per_week" label="平均单人周工时限制 (硬约束)">
             <InputNumber addonAfter="小时" min={1} max={100} className="w-full" />
          </Form.Item>
        </Form>
      )}

      {step === 1 && (
        <div className="py-6">
          <Result
            status="success"
            title="方案试算完成！"
            subTitle="基于 AI 排班算法及规则约束，为您自动产出了以下备选方案。"
          />
          <div className="mt-8 flex gap-4 justify-center">
             {drafts.map((draft, idx) => (
                <div
                  key={draft.id}
                  className={`border-2 rounded-xl p-4 cursor-pointer w-[280px] transition-all
                  ${selectedDraftIndex === idx ? 'border-blue-600 bg-blue-50 shadow-md' : 'border-slate-200 bg-white hover:border-slate-400'}`}
                  onClick={() => setSelectedDraftIndex(idx)}
                >
                   <div className="font-black text-slate-900 text-lg mb-2">{draft.name}</div>
                   <div className="text-slate-600 mb-4">为您调度了 {draft.data.length} 个排班工时区块。该方案严格遵循了劳动规则、预先录入的冲突策略与休假约束。</div>
                   {selectedDraftIndex === idx && <Tag color="processing" className="m-0 font-bold border-0 bg-blue-600 text-white">当前选中</Tag>}
                </div>
             ))}
          </div>
        </div>
      )}
    </Modal>
  );
};
