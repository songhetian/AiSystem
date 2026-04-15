import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import {
  Alert,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  TimePicker,
  Typography,
  message,
  Button,
} from "antd";
import { SaveOutlined, SettingOutlined } from "@ant-design/icons";
import dayjs from "dayjs";
import { attendanceApi } from "@/api/attendance";
import { systemApi } from "@/api/system";

const { Title, Text } = Typography;

// 考勤规则配置（弹性考勤、迟到/早退判定、假期配置）
export function AttendanceRuleConfig() {
  const [form] = Form.useForm();
  const queryClient = useQueryClient();

  const { data: departments = [] } = useQuery({
    queryKey: ["system-departments"],
    queryFn: systemApi.listDepartments,
  });

  const { data: config } = useQuery({
    queryKey: ["attendance-rule-config"],
    queryFn: attendanceApi.getAttendanceConfig,
    onSuccess: (data: any) => {
      if (data) {
        form.setFieldsValue({
          ...data,
          flex_start_range: data.flex_start_range
            ? [
                dayjs(data.flex_start_range[0], "HH:mm"),
                dayjs(data.flex_start_range[1], "HH:mm"),
              ]
            : undefined,
          flex_end_range: data.flex_end_range
            ? [
                dayjs(data.flex_end_range[0], "HH:mm"),
                dayjs(data.flex_end_range[1], "HH:mm"),
              ]
            : undefined,
        });
      }
    },
  } as any);

  const saveMutation = useMutation({
    mutationFn: (values: any) => {
      const payload = {
        ...values,
        flex_start_range: values.flex_start_range
          ? [
              values.flex_start_range[0].format("HH:mm"),
              values.flex_start_range[1].format("HH:mm"),
            ]
          : undefined,
        flex_end_range: values.flex_end_range
          ? [
              values.flex_end_range[0].format("HH:mm"),
              values.flex_end_range[1].format("HH:mm"),
            ]
          : undefined,
      };
      return attendanceApi.saveAttendanceConfig(payload);
    },
    onSuccess: () => {
      message.success("考勤规则已保存");
      queryClient.invalidateQueries({ queryKey: ["attendance-rule-config"] });
    },
    onError: () => message.error("保存失败，请重试"),
  });

  return (
    <Form
      form={form}
      layout="vertical"
      onFinish={saveMutation.mutate}
      initialValues={{
        late_threshold_min: 15,
        early_leave_threshold_min: 15,
        absent_threshold_min: 60,
        flex_enabled: false,
        holiday_sync_enabled: true,
      }}
    >
      <Space direction="vertical" style={{ width: "100%" }} size={20}>
        {/* 适用范围 */}
        <Card
          title={
            <Title level={5} style={{ margin: 0 }}>
              适用范围
            </Title>
          }
          size="small"
          className="rounded-xl border-slate-200 shadow-sm"
        >
          <Form.Item name="dept_ids" label="适用部门（不选则全部部门生效）">
            <Select
              mode="multiple"
              allowClear
              placeholder="选择部门"
              options={departments.map((d: any) => ({
                label: d.name,
                value: d.id,
              }))}
            />
          </Form.Item>
          <Alert
            type="info"
            message="同一时间仅生效一套主规则，按部门配置不同规则时，部门规则优先级高于全局规则。"
            showIcon
            className="rounded-lg"
          />
        </Card>

        {/* 基础考勤规则 */}
        <Card
          title={
            <Space>
              <SettingOutlined className="text-blue-600" />
              <Title level={5} style={{ margin: 0 }}>
                基础考勤规则
              </Title>
            </Space>
          }
          size="small"
          className="rounded-xl border-slate-200 shadow-sm"
        >
          <Space style={{ display: "flex", flexWrap: "wrap" }} size={16}>
            <Form.Item
              name="late_threshold_min"
              label="迟到判定阈值（分钟）"
              tooltip="超过上班时间多少分钟算迟到"
            >
              <InputNumber
                min={0}
                max={120}
                addonAfter="分钟"
                style={{ width: 160 }}
              />
            </Form.Item>
            <Form.Item
              name="early_leave_threshold_min"
              label="早退判定阈值（分钟）"
              tooltip="提前下班多少分钟算早退"
            >
              <InputNumber
                min={0}
                max={120}
                addonAfter="分钟"
                style={{ width: 160 }}
              />
            </Form.Item>
            <Form.Item
              name="absent_threshold_min"
              label="旷工判定阈值（分钟）"
              tooltip="迟到超过多少分钟算旷工"
            >
              <InputNumber
                min={0}
                max={480}
                addonAfter="分钟"
                style={{ width: 160 }}
              />
            </Form.Item>
          </Space>

          <Form.Item
            name="late_grace_min"
            label="迟到免罚时间（分钟）"
            tooltip="迟到多少分钟内不记罚，0表示不设免罚"
          >
            <InputNumber
              min={0}
              max={60}
              addonAfter="分钟"
              style={{ width: 160 }}
            />
          </Form.Item>
        </Card>

        {/* 弹性考勤 */}
        <Card
          title={
            <Title level={5} style={{ margin: 0 }}>
              弹性考勤配置
            </Title>
          }
          size="small"
          className="rounded-xl border-slate-200 shadow-sm"
        >
          <Form.Item
            name="flex_enabled"
            label="启用弹性考勤"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>

          <Form.Item
            noStyle
            shouldUpdate={(prev, curr) =>
              prev.flex_enabled !== curr.flex_enabled
            }
          >
            {({ getFieldValue }) =>
              getFieldValue("flex_enabled") ? (
                <Space style={{ display: "flex" }} size={16}>
                  <Form.Item
                    name="flex_start_range"
                    label="弹性上班时间范围"
                    tooltip="例如：8:30 ~ 9:30，员工在此范围内打卡均视为正常"
                  >
                    <TimePicker.RangePicker format="HH:mm" />
                  </Form.Item>
                  <Form.Item
                    name="flex_end_range"
                    label="弹性下班时间范围"
                    tooltip="例如：17:30 ~ 18:30"
                  >
                    <TimePicker.RangePicker format="HH:mm" />
                  </Form.Item>
                </Space>
              ) : null
            }
          </Form.Item>
        </Card>

        {/* 假期配置 */}
        <Card
          title={
            <Title level={5} style={{ margin: 0 }}>
              假期配置
            </Title>
          }
          size="small"
          className="rounded-xl border-slate-200 shadow-sm"
        >
          <Form.Item
            name="holiday_sync_enabled"
            label="自动同步法定节假日"
            valuePropName="checked"
          >
            <Switch />
          </Form.Item>
          <Form.Item
            name="custom_holidays"
            label="公司自定义假期（每行一个日期，格式：YYYY-MM-DD）"
          >
            <Input.TextArea
              rows={4}
              placeholder={"2024-02-09\n2024-02-10\n（春节补假）"}
            />
          </Form.Item>
          <Alert
            type="info"
            message="假期期间员工无需打卡，考勤状态自动标记为正常。"
            showIcon
            className="rounded-lg"
          />
        </Card>

        <Button
          type="primary"
          htmlType="submit"
          icon={<SaveOutlined />}
          loading={saveMutation.isPending}
          size="large"
          className="font-bold bg-slate-900 border-none"
        >
          保存考勤规则
        </Button>
      </Space>
    </Form>
  );
}
