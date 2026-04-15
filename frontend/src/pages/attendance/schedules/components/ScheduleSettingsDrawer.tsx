import { Drawer, Form, Button, Switch, InputNumber, Divider, Space, Typography, message } from 'antd';
import { useEffect } from 'react';
import { useQuery, useMutation } from '@tanstack/react-query';
import { attendanceApi } from '@/api/attendance';

const { Title, Text } = Typography;

interface ScheduleSettingsDrawerProps {
  open: boolean;
  onClose: () => void;
}

export const ScheduleSettingsDrawer = ({ open, onClose }: ScheduleSettingsDrawerProps) => {
  const [form] = Form.useForm();

  const { data, isLoading } = useQuery({
    queryKey: ['attendance-settings'],
    queryFn: attendanceApi.getAiConfig,
    enabled: open,
  });

  const { mutateAsync: saveSettings, isPending: saving } = useMutation({
    mutationFn: attendanceApi.updateAiConfig,
    onSuccess: () => {
      message.success('系统设置已保存');
      onClose();
    }
  });

  useEffect(() => {
    if (data) {
      form.setFieldsValue({
        ignore_conflict: data.conflict_rules?.ignore_conflict ?? false,
        max_continuous_days: data.emp_preferences?.max_continuous_days ?? 6,
        show_conflict_warning: data.ui_settings?.show_conflict_warning ?? true,
        default_opacity: data.ui_settings?.default_opacity ?? 50,
      });
    }
  }, [data, form]);

  const handleSave = async () => {
    const values = await form.validateFields();
    await saveSettings({
      conflict_rules: { ignore_conflict: values.ignore_conflict },
      emp_preferences: { max_continuous_days: values.max_continuous_days },
      ui_settings: {
        show_conflict_warning: values.show_conflict_warning,
        default_opacity: values.default_opacity
      }
    });
  };

  return (
    <Drawer
      title={<span className="font-black text-slate-900">排班系统全局设置</span>}
      width={480}
      open={open}
      onClose={onClose}
      extra={
        <Button type="primary" onClick={handleSave} loading={saving} className="bg-slate-900 font-bold border-none">
          保存修改
        </Button>
      }
    >
      <Spin spinning={isLoading}>
        <Form form={form} layout="vertical">
          <div className="mb-6">
            <Title level={5} className="!mb-1 font-bold text-slate-900">视觉与显示规则</Title>
            <Text type="secondary" className="text-sm font-medium text-slate-500 mb-4 block">定义看板在员工侧和管理侧的统一阅读体验。</Text>
            
            <Form.Item name="show_conflict_warning" valuePropName="checked" className="mb-4">
              <div className="flex justify-between items-center bg-slate-50 p-4 rounded-xl">
                <div>
                  <div className="font-bold text-slate-900">班次时段冲突物理警告</div>
                  <div className="text-xs text-slate-500 mt-1">若同一员工同一天被排两个冲突重叠班次，进行红色醒目告警</div>
                </div>
                <Switch />
              </div>
            </Form.Item>
            
            <Form.Item name="default_opacity" label={<span className="font-bold text-slate-900">色块默认覆盖透明度 (%)</span>}>
              <InputNumber min={10} max={100} className="w-full" size="large" />
            </Form.Item>
          </div>

          <Divider />

          <div className="mb-6">
            <Title level={5} className="!mb-1 font-bold text-slate-900">合规与智能约束</Title>
            <Text type="secondary" className="text-sm font-medium text-slate-500 mb-4 block">限制部分非人道或违反劳动法的强制排班行为，且作用于 AI 统筹计算。</Text>

            <Form.Item name="max_continuous_days" label={<span className="font-bold text-slate-900">限制最大连班天数（疲劳管控）</span>}>
              <InputNumber addonAfter="天" min={1} max={30} className="w-full" size="large" />
            </Form.Item>

            <Form.Item name="ignore_conflict" valuePropName="checked">
              <div className="flex justify-between items-center bg-rose-50 p-4 rounded-xl border border-rose-100">
                <div>
                  <div className="font-bold text-rose-900">强制放行所有排班冲突</div>
                  <div className="text-xs text-rose-600 mt-1">仅超级管理员建议开启，绕过所有排班时间互斥检测</div>
                </div>
                <Switch danger />
              </div>
            </Form.Item>
          </div>
        </Form>
      </Spin>
    </Drawer>
  );
};
