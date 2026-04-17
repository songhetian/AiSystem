import React, { useState, useEffect } from "react";
import {
  Card,
  Tabs,
  Calendar,
  Badge,
  Form,
  Select,
  Checkbox,
  InputNumber,
  Input,
  Button,
  Table,
  Tag,
  Rate,
  message,
  Drawer,
  Space,
  Typography,
  Row,
  Col,
  Empty,
  Divider,
  DatePicker,
  Alert,
} from "antd";
import {
  CalendarOutlined,
  HeartOutlined,
  SwapOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  InfoCircleOutlined,
  SaveOutlined,
  ArrowLeftOutlined,
  ThunderboltOutlined,
} from "@ant-design/icons";
import dayjs, { type Dayjs } from "dayjs";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { attendanceApi } from "@/api/attendance";
import { useGlobalStore } from "@/models/global";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import GlobalLoading from "@/components/common/GlobalLoading";

const { Title, Text } = Typography;
const { TextArea } = Input;

const WEEKDAYS = ["周日", "周一", "周二", "周三", "周四", "周五", "周六"];

// 判断是否为移动端
const useIsMobile = () => {
  const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);
  return isMobile;
};

// ============================================
// 我的排班日历面板
// ============================================
const MyCalendarPanel: React.FC = () => {
  const isMobile = useIsMobile();
  const [month, setMonth] = useState(dayjs());
  const [feedbackOpen, setFeedbackOpen] = useState(false);
  const [feedbackDate, setFeedbackDate] = useState("");
  const [feedbackForm] = Form.useForm();
  const [globalLoading, setGlobalLoading] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["my-schedule", month.format("YYYY-MM")],
    queryFn: () =>
      attendanceApi.getMySchedules({
        start_date: month.startOf("month").format("YYYY-MM-DD"),
        end_date: month.endOf("month").format("YYYY-MM-DD"),
      }),
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { mutateAsync: submitFeedback, isPending: submittingFeedback } =
    useMutation({
      mutationFn: attendanceApi.submitFeedback,
      onSuccess: () => {
        message.success("感谢您的反馈！");
        setFeedbackOpen(false);
        feedbackForm.resetFields();
      },
      onError: (error: Error) => {
        message.error(`提交失败: ${error.message}`);
      },
    });

  const scheduleMap = new Map<string, string>();
  (data?.schedules ?? []).forEach((s: any) =>
    scheduleMap.set(s.date, s.shift_name),
  );

  const dateCellRender = (value: Dayjs) => {
    const dateStr = value.format("YYYY-MM-DD");
    const shift = scheduleMap.get(dateStr);
    if (!shift) return null;
    return (
      <div className="flex flex-col items-center">
        <div
          className={`w-full text-center py-1 mt-1 rounded-lg ${isMobile ? "scale-75" : ""}`}
          style={{ background: "rgba(59, 130, 246, 0.1)" }}
        >
          <span className="text-[10px] font-black text-blue-700">{shift}</span>
        </div>
      </div>
    );
  };

  const handleFeedbackClick = (dateStr: string) => {
    setFeedbackDate(dateStr);
    setFeedbackOpen(true);
  };

  const handleFeedbackSubmit = async () => {
    try {
      const values = await feedbackForm.validateFields();
      setGlobalLoading(true);
      await submitFeedback({
        schedule_date: feedbackDate,
        rating:
          values.rating === 5
            ? "ok"
            : values.rating >= 3
              ? "need_adjust"
              : "unreasonable",
        comment: values.comment,
      });
    } catch (error) {
      console.error("提交反馈失败:", error);
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <GlobalLoading loading={globalLoading} />
      {data?.employee && (
        <div className="mb-6 px-5 py-4 bg-white rounded-2xl flex flex-wrap items-center justify-between border border-slate-200 shadow-sm gap-4">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-full bg-slate-900 flex items-center justify-center text-white font-black text-lg shadow-lg">
              {data.employee.name?.[0]}
            </div>
            <div>
              <div className="font-black text-slate-900 text-lg leading-tight">
                {data.employee.name}
              </div>
              <div className="text-slate-500 font-bold text-xs mt-1">
                本月累计排班 {data.schedules?.length ?? 0} 个班次
              </div>
            </div>
          </div>
          <div className="bg-blue-50 px-4 py-2 rounded-xl flex items-center gap-2 border border-blue-100">
            <InfoCircleOutlined className="text-blue-500" />
            <Text className="text-xs font-bold text-blue-700">
              点击日期可向主管提交排班建议
            </Text>
          </div>
        </div>
      )}

      <Card
        className="rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
        bodyStyle={{ padding: isMobile ? 8 : 24 }}
        loading={isLoading}
      >
        <Calendar
          fullscreen={!isMobile}
          cellRender={dateCellRender}
          onPanelChange={(val) => setMonth(val)}
          onSelect={(val) => {
            const dateStr = val.format("YYYY-MM-DD");
            if (scheduleMap.has(dateStr)) handleFeedbackClick(dateStr);
          }}
          headerRender={({ value, onChange }) => {
            return (
              <div className="p-4 flex justify-between items-center">
                <Title
                  level={4}
                  className="!mb-0 !text-slate-900 font-black tracking-tight"
                >
                  {value.format("YYYY年MM月")}
                </Title>
                <Space>
                  <Button
                    size="small"
                    className="font-bold border-slate-300"
                    onClick={() => onChange(value.subtract(1, "month"))}
                  >
                    上月
                  </Button>
                  <Button
                    size="small"
                    type="primary"
                    className="font-black bg-slate-900 border-none px-4"
                    onClick={() => onChange(dayjs())}
                  >
                    今天
                  </Button>
                  <Button
                    size="small"
                    className="font-bold border-slate-300"
                    onClick={() => onChange(value.add(1, "month"))}
                  >
                    下月
                  </Button>
                </Space>
              </div>
            );
          }}
        />
      </Card>

      <Drawer
        title={
          <span className="font-black text-slate-900">
            排班反馈 · {feedbackDate}
          </span>
        }
        open={feedbackOpen}
        onClose={() => setFeedbackOpen(false)}
        width={isMobile ? "100%" : 480}
        extra={
          <Button
            type="primary"
            onClick={handleFeedbackSubmit}
            loading={submittingFeedback}
            className="bg-slate-900 border-none font-black px-6 h-10 rounded-xl shadow-lg"
          >
            提交反馈
          </Button>
        }
      >
        <Form form={feedbackForm} layout="vertical" className="px-1">
          <Alert
            className="mb-6 rounded-xl"
            type="info"
            message={
              <span className="font-bold">
                您的意见将直接反馈给排班负责人，帮助优化后续安排。
              </span>
            }
            showIcon
          />
          <Form.Item
            name="rating"
            label={
              <span className="font-black text-slate-900 text-base">
                排班合理性评估
              </span>
            }
            initialValue={5}
            rules={[{ required: true }]}
          >
            <div className="flex flex-col gap-4">
              <Rate
                count={5}
                style={{ fontSize: 32 }}
                character={({ index }: { index?: number }) =>
                  ["😡", "😕", "😐", "😊", "😄"][index ?? 0]
                }
              />
              <div className="flex justify-between px-2 text-xs font-bold text-slate-500 uppercase tracking-widest">
                <span>非常不合理</span>
                <span>非常满意</span>
              </div>
            </div>
          </Form.Item>
          <Form.Item
            name="comment"
            label={
              <span className="font-black text-slate-900 text-base">
                补充具体建议
              </span>
            }
          >
            <TextArea
              rows={6}
              placeholder="例如：这天不顺路、班次太紧、个人有急事等..."
              maxLength={200}
              showCount
              className="rounded-xl font-bold p-4 shadow-sm border-slate-200"
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

// ============================================
// 偏好设置面板 (对齐 UI 2.0 物理隔离)
// ============================================
const PreferencePanel: React.FC<{ employeeId: string }> = ({ employeeId }) => {
  const isMobile = useIsMobile();
  const [form] = Form.useForm();
  const [initialized, setInitialized] = useState(false);
  const [globalLoading, setGlobalLoading] = useState(false);

  const { data: pref } = useQuery({
    queryKey: ["schedule-preference", employeeId],
    queryFn: () => attendanceApi.getPreference(employeeId),
    enabled: !!employeeId,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { mutateAsync: savePref, isPending: saving } = useMutation({
    mutationFn: (preference: any) =>
      attendanceApi.savePreference(employeeId, preference),
    onSuccess: () => message.success("偏好设置已同步至云端引擎"),
    onError: (error: Error) => {
      message.error(`保存失败: ${error.message}`);
    },
  });

  useEffect(() => {
    if (pref && !initialized) {
      form.setFieldsValue({
        avoid_weekdays: pref.avoid_weekdays ?? [],
        can_overtime: pref.can_overtime ?? false,
        max_days_per_week: pref.max_days_per_week ?? 5,
        avoid_shifts: pref.avoid_shifts ?? [],
        prefer_shifts: pref.prefer_shifts ?? [],
        note: pref.note ?? "",
      });
      setInitialized(true);
    }
  }, [pref, form, initialized]);

  const handleSave = async () => {
    try {
      const values = await form.validateFields();
      setGlobalLoading(true);
      await savePref(values);
    } catch (error) {
      console.error("保存偏好失败:", error);
    } finally {
      setGlobalLoading(false);
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <GlobalLoading loading={globalLoading} />
      <div className="mb-8 text-center sm:text-left">
        <Title level={3} className="!text-slate-900 font-black !mb-2">
          排班偏好设置
        </Title>
        <Text className="text-slate-500 font-bold text-base">
          您的个人偏好将作为 AI 排班引擎推论时的重要权重依据
        </Text>
      </div>

      <Form form={form} layout="vertical">
        <Tabs
          type="card"
          className="rhino-tabs"
          items={[
            {
              key: "time",
              label: (
                <span className="px-6 font-black text-base">
                  <CalendarOutlined /> 时间偏好
                </span>
              ),
              children: (
                <div className="bg-white p-8 rounded-b-2xl border border-slate-200 border-t-0 shadow-sm">
                  <Form.Item
                    name="avoid_weekdays"
                    label={
                      <span className="font-black text-slate-900">
                        希望避开的日期
                      </span>
                    }
                  >
                    <Checkbox.Group className="w-full">
                      <Row gutter={[16, 16]}>
                        {WEEKDAYS.map((day, i) => (
                          <Col key={i} span={isMobile ? 8 : 6}>
                            <Checkbox
                              value={i}
                              className="font-bold text-slate-700"
                            >
                              {day}
                            </Checkbox>
                          </Col>
                        ))}
                      </Row>
                    </Checkbox.Group>
                  </Form.Item>
                  <Divider className="border-slate-100" />
                  <Row gutter={24}>
                    <Col span={isMobile ? 24 : 12}>
                      <Form.Item
                        name="max_days_per_week"
                        label={
                          <span className="font-black text-slate-900">
                            每周最高上班天数
                          </span>
                        }
                      >
                        <InputNumber
                          min={1}
                          max={7}
                          addonAfter="天/周"
                          size="large"
                          className="w-full font-black border-slate-200"
                        />
                      </Form.Item>
                    </Col>
                    <Col
                      span={isMobile ? 24 : 12}
                      className="flex flex-col justify-end pb-8"
                    >
                      <Form.Item
                        name="can_overtime"
                        valuePropName="checked"
                        className="mb-0"
                      >
                        <Checkbox className="font-black text-slate-900 border-slate-300">
                          我愿意接受合理的加班安排
                        </Checkbox>
                      </Form.Item>
                    </Col>
                  </Row>
                </div>
              ),
            },
            {
              key: "shifts",
              label: (
                <span className="px-6 font-black text-base">
                  <ThunderboltOutlined /> 班次与备注
                </span>
              ),
              children: (
                <div className="bg-white p-8 rounded-b-2xl border border-slate-200 border-t-0 shadow-sm space-y-6">
                  <Form.Item
                    name="prefer_shifts"
                    label={
                      <span className="font-black text-slate-900">
                        最渴望分配到的班次
                      </span>
                    }
                  >
                    <Select
                      mode="tags"
                      placeholder="输入班次名称，如：早班"
                      size="large"
                      className="font-black"
                      tokenSeparators={[","]}
                      open={false}
                    />
                  </Form.Item>
                  <Form.Item
                    name="avoid_shifts"
                    label={
                      <span className="font-black text-slate-900">
                        尽量想要避开的班次
                      </span>
                    }
                  >
                    <Select
                      mode="tags"
                      placeholder="输入班次名称，如：大夜班"
                      size="large"
                      className="font-black"
                      tokenSeparators={[","]}
                      open={false}
                    />
                  </Form.Item>
                  <Form.Item
                    name="note"
                    label={
                      <span className="font-black text-slate-900">
                        特别情况补充说明
                      </span>
                    }
                  >
                    <TextArea
                      rows={4}
                      placeholder="如有通勤不便、私人急事、技能限制等，请详细备注说明"
                      maxLength={200}
                      showCount
                      className="rounded-xl font-bold p-4 border-slate-200"
                    />
                  </Form.Item>
                </div>
              ),
            },
          ]}
        />

        <div className="mt-8">
          <Button
            type="primary"
            size="large"
            block
            loading={saving}
            onClick={handleSave}
            icon={<SaveOutlined />}
            className="h-16 px-12 font-black bg-slate-900 border-none rounded-2xl shadow-2xl transition-all hover:scale-[1.01]"
          >
            立即保存并同步偏好
          </Button>
        </div>
      </Form>
    </div>
  );
};

// ============================================
// 调班申请面板
// ============================================
const SwapRequestPanel: React.FC = () => {
  const isMobile = useIsMobile();
  const [formOpen, setFormOpen] = useState(false);
  const [swapForm] = Form.useForm();
  const queryClient = useQueryClient();
  const [globalLoading, setGlobalLoading] = useState(false);

  const { data: requests = [], isLoading } = useQuery({
    queryKey: ["my-swap-requests"],
    queryFn: attendanceApi.listSwapRequests,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const { mutateAsync: submitSwap, isPending: submitting } = useMutation({
    mutationFn: attendanceApi.submitSwapRequest,
    onSuccess: () => {
      message.success("调班申请已进入自动化审批流");
      setFormOpen(false);
      swapForm.resetFields();
      queryClient.invalidateQueries({ queryKey: ["my-swap-requests"] });
    },
    onError: (error: Error) => {
      message.error(`提交失败: ${error.message}`);
    },
  });

  const columns = [
    {
      title: "日期",
      dataIndex: "change_date",
      width: 100,
      render: (d: string) => (
        <span className="font-black text-slate-900">
          {dayjs(d).format("MM-DD")}
        </span>
      ),
    },
    {
      title: "调整内容",
      key: "swap",
      render: (record: any) => (
        <Space
          split={
            <ArrowLeftOutlined className="text-slate-400 text-[10px] rotate-180" />
          }
          size="small"
        >
          <Tag className="font-black m-0 border-slate-200 text-slate-500">
            {record.before_shift_name}
          </Tag>
          <Tag color="blue" className="font-black m-0 px-3">
            {record.after_shift_name}
          </Tag>
        </Space>
      ),
    },
    {
      title: "状态",
      dataIndex: "notify_status",
      width: 100,
      render: (s: number) => {
        if (s === 1)
          return (
            <Badge
              status="success"
              text={<span className="font-black text-green-600">已批准</span>}
            />
          );
        if (s === 2)
          return (
            <Badge
              status="error"
              text={<span className="font-black text-red-600">已拒绝</span>}
            />
          );
        return (
          <Badge
            status="processing"
            text={<span className="font-black text-blue-600">待审批</span>}
          />
        );
      },
    },
    {
      title: "理由",
      dataIndex: "reason",
      ellipsis: true,
      className: isMobile ? "hidden" : "font-bold text-slate-500",
    },
  ];

  return (
    <div className="space-y-6">
      <GlobalLoading loading={globalLoading} />
      <Card
        className="rounded-3xl border border-slate-200 shadow-sm overflow-hidden"
        bodyStyle={{ padding: 24 }}
      >
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-6 mb-8">
          <div>
            <Title
              level={4}
              className="!text-slate-900 font-black !mb-2 tracking-tight"
            >
              调班事项看板
            </Title>
            <Text className="text-slate-500 font-bold text-sm">
              申请获主管批核后，系统将自动修订主排班表并推送通知
            </Text>
          </div>
          <Button
            type="primary"
            icon={<SwapOutlined />}
            size="large"
            onClick={() => setFormOpen(true)}
            className="w-full sm:w-auto h-14 px-10 bg-slate-900 border-none font-black rounded-2xl shadow-xl transition-all hover:translate-y-[-2px]"
          >
            发起调班申请
          </Button>
        </div>

        <Table
          dataSource={requests}
          columns={columns}
          rowKey="id"
          loading={isLoading}
          size={isMobile ? "small" : "middle"}
          pagination={{ pageSize: 8 }}
          className="rhino-table"
        />
      </Card>

      <Drawer
        title={
          <span className="font-black text-slate-900 text-xl tracking-tight">
            发起调配申请
          </span>
        }
        open={formOpen}
        onClose={() => setFormOpen(false)}
        width={isMobile ? "100%" : 520}
        extra={
          <Button
            type="primary"
            loading={submitting}
            size="large"
            onClick={async () => {
              try {
                const values = await swapForm.validateFields();
                setGlobalLoading(true);
                await submitSwap({
                  date: values.schedule_date.format("YYYY-MM-DD"),
                  before_shift: values.current_shift_name,
                  after_shift: values.target_shift_name,
                  reason: values.reason,
                });
              } catch (error) {
                console.error("提交调班申请失败:", error);
              } finally {
                setGlobalLoading(false);
              }
            }}
            className="bg-slate-900 border-none font-black px-10 h-12 rounded-2xl shadow-2xl"
          >
            立即提交审核
          </Button>
        }
      >
        <Form form={swapForm} layout="vertical" className="px-2">
          <Alert
            className="mb-8 rounded-2xl border-orange-100 bg-orange-50"
            type="warning"
            message={
              <span className="font-black text-orange-900">
                请优先与同事协商达成一致后再提交，以确保服务连续性。
              </span>
            }
            showIcon
          />
          <Form.Item
            name="schedule_date"
            label={
              <span className="font-black text-slate-900 text-base">
                需要调整的日期
              </span>
            }
            rules={[{ required: true }]}
          >
            <DatePicker
              className="w-full h-12 rounded-xl font-black border-slate-200"
              disabledDate={(d) => d < dayjs().startOf("day")}
            />
          </Form.Item>
          <Row gutter={16}>
            <Col span={12}>
              <Form.Item
                name="current_shift_name"
                label={
                  <span className="font-black text-slate-900 text-base">
                    原定所属班次
                  </span>
                }
                rules={[{ required: true }]}
              >
                <Input
                  placeholder="输入原班次"
                  size="large"
                  className="rounded-xl font-black border-slate-200"
                />
              </Form.Item>
            </Col>
            <Col span={12}>
              <Form.Item
                name="target_shift_name"
                label={
                  <span className="font-black text-slate-900 text-base">
                    期望置换班次
                  </span>
                }
                rules={[{ required: true }]}
              >
                <Input
                  placeholder="输入目标班次/休息"
                  size="large"
                  className="rounded-xl font-black border-slate-200"
                />
              </Form.Item>
            </Col>
          </Row>
          <Form.Item
            name="reason"
            label={
              <span className="font-black text-slate-900 text-base">
                详细调配事由
              </span>
            }
            rules={[{ required: true }]}
          >
            <TextArea
              rows={6}
              placeholder="请务必详细说明具体事由（紧急私事、休假、调休等）"
              maxLength={300}
              showCount
              className="rounded-2xl font-black p-4 border-slate-200 shadow-inner"
            />
          </Form.Item>
        </Form>
      </Drawer>
    </div>
  );
};

// ============================================
// 主页面
// ============================================
export default function MySchedulePage() {
  const isMobile = useIsMobile();
  const currentUser = useGlobalStore((s) => s.currentUser);
  const employeeId = (currentUser as any)?.employee_id ?? currentUser?.id ?? "";

  // 快捷键支持
  useKeyboardShortcuts({
    escape: () => {
      // Close any open drawers by resetting state
      window.dispatchEvent(new KeyboardEvent("keydown", { key: "Escape" }));
    },
  });

  return (
    <div className={`min-h-screen bg-slate-50 ${isMobile ? "pb-24" : ""}`}>
      {/* 顶部状态栏 */}
      <div className="bg-white border-b border-slate-200 sticky top-0 z-10 px-6 py-4 shadow-sm">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Space align="center" size={16}>
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-blue-600 to-indigo-800 flex items-center justify-center shadow-2xl">
              <CalendarOutlined className="text-white text-xl" />
            </div>
            <div>
              <Title
                level={4}
                className="!mb-0 !text-slate-900 font-black tracking-tighter"
              >
                我的排班中心
              </Title>
              {!isMobile && (
                <Text className="text-slate-500 text-xs font-black uppercase tracking-widest">
                  Employee Scheduling Intelligence
                </Text>
              )}
            </div>
          </Space>
          <Button
            type="text"
            icon={<ArrowLeftOutlined />}
            className="text-slate-500 font-black hover:text-slate-900 transition-colors"
          >
            返回门户
          </Button>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-4 sm:p-10">
        <Tabs
          defaultActiveKey="calendar"
          size="large"
          className="rhino-main-tabs"
          items={[
            {
              key: "calendar",
              label: (
                <span className="font-black px-6 text-base">
                  <CalendarOutlined /> 个人日历
                </span>
              ),
              children: (
                <div className="py-6">
                  <MyCalendarPanel />
                </div>
              ),
            },
            {
              key: "preference",
              label: (
                <span className="font-black px-6 text-base">
                  <HeartOutlined /> 偏好设置
                </span>
              ),
              children: (
                <div className="py-6">
                  <PreferencePanel employeeId={employeeId} />
                </div>
              ),
            },
            {
              key: "swap",
              label: (
                <span className="font-black px-6 text-base">
                  <SwapOutlined /> 调拨调换
                </span>
              ),
              children: (
                <div className="py-6">
                  <SwapRequestPanel />
                </div>
              ),
            },
          ]}
        />
      </div>
    </div>
  );
}
