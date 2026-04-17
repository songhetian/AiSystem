import { useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Button,
  Card,
  DatePicker,
  Form,
  Input,
  Select,
  Space,
  Tag,
  message,
} from "antd";
import dayjs from "dayjs";
import { useNavigate } from "react-router-dom";
import { examApi, type ExamPlan } from "@/api/exam";
import { personnelApi } from "@/api/personnel";
import { systemApi } from "@/api/system";
import { BaseModal } from "@/components/common/BaseModal";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";
import { useDebounce } from "@/hooks/useDebounce";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

export default function ExamPlansPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [status, setStatus] = useState<string>();
  const [form] = Form.useForm();
  const searchInputRef = useRef<any>(null);

  // 搜索防抖
  const debouncedKeyword = useDebounce(keyword, 500);

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, "exam-plan-form", 30000);

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => {
      setOpen(true);
      form.setFieldsValue({
        reminder_mode: "notice",
        pass_score: 60,
        duration_min: 60,
        max_attempts: 3,
        allow_retake: 0,
        absent_mark_minutes: 30,
        allow_makeup: 0,
        makeup_limit: 1,
      });
    },
    "Ctrl+f": () => searchInputRef.current?.focus(),
    "Ctrl+r": () => {
      refresh();
      message.success("已刷新");
    },
    Escape: () => {
      setOpen(false);
    },
  });

  const { data: plans = [], isLoading } = useQuery<ExamPlan[]>({
    queryKey: ["exam-plans", debouncedKeyword, status],
    queryFn: () =>
      examApi.listPlans({ keyword: debouncedKeyword || undefined, status }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { data: papers = [] } = useQuery({
    queryKey: ["exam-paper-options"],
    queryFn: examApi.listPapers,
  });

  const { data: departments = [] } = useQuery({
    queryKey: ["exam-plan-departments"],
    queryFn: systemApi.listDepartments,
  });

  const { data: employees = [] } = useQuery({
    queryKey: ["exam-plan-employees"],
    queryFn: personnelApi.listEmployees,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["exam-plans"] });
    await queryClient.invalidateQueries({ queryKey: ["exam-my"] });
    await queryClient.invalidateQueries({ queryKey: ["exam-results"] });
  };

  const createMutation = useMutation({
    mutationFn: async (values: Record<string, any>) =>
      examApi.createPlan({
        plan_name: values.plan_name,
        paper_id: values.paper_id,
        start_time: values.time_range[0].toISOString(),
        end_time: values.time_range[1].toISOString(),
        reminder_mode: values.reminder_mode,
        force_enter: values.reminder_mode === "force" ? 1 : 0,
        pass_score: values.pass_score,
        duration_min: values.duration_min,
        max_attempts: values.max_attempts,
        allow_retake: values.allow_retake,
        absent_mark_minutes: values.absent_mark_minutes,
        allow_makeup: values.allow_makeup,
        makeup_limit: values.allow_makeup ? values.makeup_limit : 0,
        dept_ids: values.dept_ids,
        employee_ids: values.employee_ids,
      }),
    onSuccess: async () => {
      message.success("考试计划已创建");
      setOpen(false);
      form.resetFields();
      clearDraft();
      await refresh();
    },
    onError: (error: any) => {
      message.error(error?.message || "创建失败");
    },
  });
    },
  });

  const columns: ProColumns<ExamPlan>[] = useMemo(
    () => [
      {
        title: "计划名称",
        dataIndex: "plan_name",
        render: (_, record) => (
          <Button
            type="link"
            style={{ padding: 0 }}
            onClick={() => navigate(`/exam/plans/${record.id}`)}
          >
            {record.plan_name}
          </Button>
        ),
      },
      { title: "试卷", render: (_, record) => record.paper?.paper_name ?? "-" },
      {
        title: "考试时间",
        render: (_, record) =>
          `${dayjs(record.start_time).format("YYYY-MM-DD HH:mm")} ~ ${dayjs(record.end_time).format("YYYY-MM-DD HH:mm")}`,
      },
      {
        title: "时长",
        dataIndex: "duration_min",
        width: 90,
        render: (_, record) => `${record.duration_min} 分钟`,
      },
      {
        title: "次数规则",
        width: 220,
        render: (_, record) =>
          `${record.max_attempts ?? 1} 次${record.allow_retake === 1 ? " / 允许重考" : ""}${record.allow_makeup === 1 ? ` / 补考 ${record.makeup_limit ?? 0} 次` : ""}`,
      },
      {
        title: "提醒模式",
        dataIndex: "reminder_mode",
        width: 100,
        render: (_, record) => (
          <Tag color={record.reminder_mode === "force" ? "red" : "blue"}>
            {record.reminder_mode === "force" ? "强制进入" : "消息提醒"}
          </Tag>
        ),
      },
      { title: "参与人数", dataIndex: "target_count", width: 90 },
      { title: "已交卷", dataIndex: "submitted_count", width: 90 },
      { title: "通过", dataIndex: "pass_count", width: 80 },
      {
        title: "状态",
        dataIndex: "runtime_status",
        width: 100,
        render: (_, record) => {
          const colorMap: Record<string, string> = {
            upcoming: "gold",
            ongoing: "processing",
            ended: "default",
          };
          const labelMap: Record<string, string> = {
            upcoming: "未开始",
            ongoing: "进行中",
            ended: "已结束",
          };
          return (
            <Tag color={colorMap[record.runtime_status || "upcoming"]}>
              {labelMap[record.runtime_status || "upcoming"]}
            </Tag>
          );
        },
      },
    ],
    [navigate],
  );

  return (
    <>
      <Card
        title="考试计划"
        extra={
          <Permission code="exam:plan:create">
            <Button
              type="primary"
              onClick={() => {
                setOpen(true);
                form.setFieldsValue({
                  reminder_mode: "notice",
                  pass_score: 60,
                  duration_min: 60,
                  max_attempts: 3,
                  allow_retake: 0,
                  absent_mark_minutes: 30,
                  allow_makeup: 0,
                  makeup_limit: 1,
                });
              }}
              title="快捷键: Ctrl+N"
            >
              新建计划
            </Button>
          </Permission>
        }
      >
        <Space style={{ marginBottom: 16 }} wrap>
          <Input
            ref={searchInputRef}
            allowClear
            style={{ width: 240 }}
            placeholder="搜索计划名称/试卷 (Ctrl+F)"
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
          />
          <Select
            allowClear
            style={{ width: 160 }}
            placeholder="计划状态"
            value={status}
            onChange={setStatus}
            options={[
              { label: "未开始", value: "upcoming" },
              { label: "进行中", value: "ongoing" },
              { label: "已结束", value: "ended" },
            ]}
          />
        </Space>
        <GlobalLoading loading={isLoading}>
          <BaseTable<ExamPlan>
            rowKey="id"
            columns={columns}
            dataSource={plans}
            loading={isLoading}
          />
        </GlobalLoading>
      </Card>

      <BaseModal
        open={open}
        title="新建考试计划"
        confirmLoading={createMutation.isPending}
        onCancel={() => {
          setOpen(false);
          form.resetFields();
        }}
        onOk={() => {
          form.validateFields().then((values) => createMutation.mutate(values));
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{
            reminder_mode: "notice",
            pass_score: 60,
            duration_min: 60,
            max_attempts: 3,
            allow_retake: 0,
            absent_mark_minutes: 30,
            allow_makeup: 0,
            makeup_limit: 1,
          }}
        >
          <Form.Item
            label="计划名称"
            name="plan_name"
            rules={[{ required: true, message: "请输入计划名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item
            label="选择试卷"
            name="paper_id"
            rules={[{ required: true, message: "请选择试卷" }]}
          >
            <Select
              options={papers.map((item: any) => ({
                label: `${item.paper_name} | ${item.total_score}分 | ${item.duration_min}分钟`,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item
            label="考试时间"
            name="time_range"
            rules={[{ required: true, message: "请选择考试时间" }]}
          >
            <DatePicker.RangePicker showTime style={{ width: "100%" }} />
          </Form.Item>
          <Space style={{ display: "flex" }} size={12}>
            <Form.Item
              label="提醒方式"
              name="reminder_mode"
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: 180 }}
                options={[
                  { label: "消息提醒", value: "notice" },
                  { label: "强制进入", value: "force" },
                ]}
              />
            </Form.Item>
            <Form.Item
              label="及格分"
              name="pass_score"
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: 120 }}
                options={[60, 70, 80, 90].map((item) => ({
                  label: `${item} 分`,
                  value: item,
                }))}
              />
            </Form.Item>
            <Form.Item
              label="答题时长"
              name="duration_min"
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: 140 }}
                options={[30, 45, 60, 90, 120].map((item) => ({
                  label: `${item} 分钟`,
                  value: item,
                }))}
              />
            </Form.Item>
            <Form.Item
              label="最大次数"
              name="max_attempts"
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: 120 }}
                options={[1, 2, 3, 5].map((item) => ({
                  label: `${item} 次`,
                  value: item,
                }))}
              />
            </Form.Item>
            <Form.Item
              label="允许重考"
              name="allow_retake"
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: 120 }}
                options={[
                  { label: "否", value: 0 },
                  { label: "是", value: 1 },
                ]}
              />
            </Form.Item>
          </Space>
          <Space style={{ display: "flex" }} size={12}>
            <Form.Item
              label="缺考判定阈值"
              name="absent_mark_minutes"
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: 160 }}
                options={[10, 15, 20, 30, 45, 60].map((item) => ({
                  label: `${item} 分钟`,
                  value: item,
                }))}
              />
            </Form.Item>
            <Form.Item
              label="允许补考"
              name="allow_makeup"
              rules={[{ required: true }]}
            >
              <Select
                style={{ width: 120 }}
                options={[
                  { label: "否", value: 0 },
                  { label: "是", value: 1 },
                ]}
              />
            </Form.Item>
            <Form.Item
              noStyle
              shouldUpdate={(prev, current) =>
                prev.allow_makeup !== current.allow_makeup
              }
            >
              {({ getFieldValue }) =>
                getFieldValue("allow_makeup") === 1 ? (
                  <Form.Item
                    label="补考次数"
                    name="makeup_limit"
                    rules={[{ required: true }]}
                  >
                    <Select
                      style={{ width: 120 }}
                      options={[1, 2, 3].map((item) => ({
                        label: `${item} 次`,
                        value: item,
                      }))}
                    />
                  </Form.Item>
                ) : null
              }
            </Form.Item>
          </Space>
          <Form.Item label="按部门安排" name="dept_ids">
            <Select
              mode="multiple"
              allowClear
              options={departments.map((item: any) => ({
                label: item.name,
                value: item.id,
              }))}
            />
          </Form.Item>
          <Form.Item label="按人员安排" name="employee_ids">
            <Select
              mode="multiple"
              allowClear
              options={employees.map((item: any) => ({
                label: `${item.name}${item.employee_no ? ` (${item.employee_no})` : ""}`,
                value: item.id,
              }))}
            />
          </Form.Item>
        </Form>
      </BaseModal>
    </>
  );
}
