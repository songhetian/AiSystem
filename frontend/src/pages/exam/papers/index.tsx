import { useMemo, useState, useRef } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { ProColumns } from "@ant-design/pro-components";
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Tag,
  message,
} from "antd";
import { examApi, type ExamPaper, type ExamPaperQuestion } from "@/api/exam";
import { BaseModal } from "@/components/common/BaseModal";
import { Permission } from "@/components/permission/Permission";
import { BaseTable } from "@/components/table/BaseTable";
import { useFormDraft } from "@/hooks/useFormDraft";
import { useKeyboardShortcuts } from "@/hooks/useKeyboardShortcuts";
import { GlobalLoading } from "@/components/common/GlobalLoading";

const questionTypeOptions = [
  { label: "单选", value: "single" },
  { label: "多选", value: "multiple" },
  { label: "判断", value: "judge" },
];

function createEmptyQuestion(): ExamPaperQuestion {
  return {
    question_type: "single",
    title: "",
    options: [
      { label: "选项 A", value: "A" },
      { label: "选项 B", value: "B" },
    ],
    correct_answer: "A",
    score: 5,
  };
}

export default function ExamPapersPage() {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<ExamPaper | null>(null);
  const [questions, setQuestions] = useState<ExamPaperQuestion[]>([
    createEmptyQuestion(),
  ]);
  const [dragIndex, setDragIndex] = useState<number | null>(null);
  const [form] = Form.useForm();

  // 表单草稿保存
  const { clearDraft } = useFormDraft(form, "exam-paper-form", 30000);

  // 快捷键支持
  useKeyboardShortcuts({
    "Ctrl+n": () => {
      setEditing(null);
      setQuestions([createEmptyQuestion()]);
      form.setFieldsValue({ pass_score: 60, duration_min: 60, enabled: true });
      setOpen(true);
    },
    "Ctrl+r": () => {
      refresh();
      message.success("已刷新");
    },
    Escape: () => {
      setOpen(false);
      setEditing(null);
    },
  });

  const { data = [], isLoading } = useQuery<ExamPaper[]>({
    queryKey: ["exam-papers"],
    queryFn: examApi.listPapers,
    staleTime: 5 * 60 * 1000,
    refetchOnWindowFocus: false,
  });

  const refresh = async () => {
    await queryClient.invalidateQueries({ queryKey: ["exam-papers"] });
  };

  const saveMutation = useMutation({
    mutationFn: async (values: Record<string, any>) => {
      const payload = {
        ...values,
        total_score: questions.reduce(
          (sum, item) => sum + Number(item.score || 0),
          0,
        ),
        questions: questions.map((item, index) => ({
          ...item,
          sort: index,
          correct_answer:
            item.question_type === "multiple"
              ? Array.isArray(item.correct_answer)
                ? item.correct_answer
                : []
              : item.correct_answer,
        })),
      } as any;

      if (editing) {
        return examApi.updatePaper(editing.id, payload);
      }

      return examApi.createPaper(payload);
    },
    onSuccess: async () => {
      message.success(editing ? "试卷已更新" : "试卷已创建");
      setOpen(false);
      setEditing(null);
      setQuestions([createEmptyQuestion()]);
      form.resetFields();
      clearDraft();
      await refresh();
    },
    onError: (error: any) => {
      message.error(error?.message || "操作失败");
    },
  });

  const columns: ProColumns<ExamPaper>[] = useMemo(
    () => [
      { title: "试卷名称", dataIndex: "paper_name" },
      { title: "题量", dataIndex: "question_count", width: 80 },
      { title: "总分", dataIndex: "total_score", width: 80 },
      { title: "及格分", dataIndex: "pass_score", width: 90 },
      {
        title: "时长",
        dataIndex: "duration_min",
        width: 90,
        render: (_, record) => `${record.duration_min} 分钟`,
      },
      {
        title: "状态",
        dataIndex: "enabled",
        width: 90,
        render: (_, record) => (
          <Tag color={record.enabled === 1 ? "success" : "default"}>
            {record.enabled === 1 ? "启用" : "停用"}
          </Tag>
        ),
      },
      {
        title: "操作",
        width: 140,
        render: (_, record) => (
          <Permission code="exam:paper:update">
            <Button
              type="link"
              onClick={() => {
                setEditing(record);
                setQuestions(
                  record.questions?.length
                    ? record.questions
                    : [createEmptyQuestion()],
                );
                form.setFieldsValue({
                  paper_name: record.paper_name,
                  description: record.description,
                  pass_score: record.pass_score,
                  duration_min: record.duration_min,
                  enabled: record.enabled === 1,
                });
                setOpen(true);
              }}
            >
              编辑
            </Button>
          </Permission>
        ),
      },
    ],
    [form],
  );

  return (
    <>
      <Card
        title="试卷管理"
        extra={
          <Permission code="exam:paper:create">
            <Button
              type="primary"
              onClick={() => {
                setEditing(null);
                setQuestions([createEmptyQuestion()]);
                form.setFieldsValue({
                  pass_score: 60,
                  duration_min: 60,
                  enabled: true,
                });
                setOpen(true);
              }}
            >
              新建试卷
            </Button>
          </Permission>
        }
      >
        <GlobalLoading loading={isLoading}>
          <BaseTable<ExamPaper>
            rowKey="id"
            columns={columns}
            dataSource={data}
            loading={isLoading}
          />
        </GlobalLoading>
      </Card>

      <BaseModal
        open={open}
        width={960}
        title={editing ? "编辑试卷" : "新建试卷"}
        confirmLoading={saveMutation.isPending}
        onCancel={() => {
          setOpen(false);
          setEditing(null);
          setQuestions([createEmptyQuestion()]);
          form.resetFields();
        }}
        onOk={() => {
          if (!questions.every((item) => item.title.trim())) {
            message.error("请完整填写题目内容");
            return;
          }
          form.validateFields().then((values) => saveMutation.mutate(values));
        }}
      >
        <Form
          form={form}
          layout="vertical"
          initialValues={{ pass_score: 60, duration_min: 60, enabled: true }}
        >
          <Form.Item
            label="试卷名称"
            name="paper_name"
            rules={[{ required: true, message: "请输入试卷名称" }]}
          >
            <Input />
          </Form.Item>
          <Form.Item label="说明" name="description">
            <Input.TextArea rows={3} />
          </Form.Item>
          <Space style={{ display: "flex" }} size={12}>
            <Form.Item
              label="及格分"
              name="pass_score"
              rules={[{ required: true }]}
            >
              <InputNumber min={0} max={100} />
            </Form.Item>
            <Form.Item
              label="考试时长"
              name="duration_min"
              rules={[{ required: true }]}
            >
              <InputNumber min={1} addonAfter="分钟" />
            </Form.Item>
            <Form.Item label="启用" name="enabled" valuePropName="checked">
              <Switch />
            </Form.Item>
          </Space>
        </Form>

        <div style={{ marginTop: 16 }}>
          <Space style={{ marginBottom: 12 }}>
            <Button
              onClick={() =>
                setQuestions((prev) => [...prev, createEmptyQuestion()])
              }
            >
              新增题目
            </Button>
            <Tag color="processing">支持拖拽调整题目顺序</Tag>
          </Space>
          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {questions.map((question, index) => (
              <Card
                key={`${index}-${question.title}`}
                size="small"
                draggable
                onDragStart={() => setDragIndex(index)}
                onDragOver={(event) => event.preventDefault()}
                onDrop={() => {
                  if (dragIndex === null || dragIndex === index) return;
                  const next = [...questions];
                  const [moved] = next.splice(dragIndex, 1);
                  next.splice(index, 0, moved);
                  setQuestions(next);
                  setDragIndex(null);
                }}
                title={`第 ${index + 1} 题`}
                extra={
                  <Button
                    danger
                    type="link"
                    onClick={() =>
                      setQuestions((prev) =>
                        prev.filter((_, itemIndex) => itemIndex !== index),
                      )
                    }
                  >
                    删除
                  </Button>
                }
              >
                <Space direction="vertical" style={{ width: "100%" }} size={12}>
                  <Select
                    value={question.question_type}
                    options={questionTypeOptions}
                    onChange={(value) =>
                      setQuestions((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index
                            ? {
                                ...item,
                                question_type: value,
                                options:
                                  value === "judge"
                                    ? [
                                        { label: "正确", value: "true" },
                                        { label: "错误", value: "false" },
                                      ]
                                    : (item.options ??
                                      createEmptyQuestion().options),
                                correct_answer:
                                  value === "multiple"
                                    ? []
                                    : value === "judge"
                                      ? "true"
                                      : "A",
                              }
                            : item,
                        ),
                      )
                    }
                  />
                  <Input.TextArea
                    rows={2}
                    value={question.title}
                    placeholder="请输入题目"
                    onChange={(event) =>
                      setQuestions((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, title: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                  <InputNumber
                    min={1}
                    max={100}
                    value={question.score}
                    addonAfter="分"
                    onChange={(value) =>
                      setQuestions((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, score: Number(value || 0) }
                            : item,
                        ),
                      )
                    }
                  />
                  {(question.options ?? []).map((option, optionIndex) => (
                    <Space
                      key={`${option.value}-${optionIndex}`}
                      style={{ display: "flex" }}
                    >
                      <Input
                        style={{ width: 100 }}
                        value={option.value}
                        disabled={question.question_type === "judge"}
                        onChange={(event) =>
                          setQuestions((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    options: (item.options ?? []).map(
                                      (currentOption, currentOptionIndex) =>
                                        currentOptionIndex === optionIndex
                                          ? {
                                              ...currentOption,
                                              value: event.target.value,
                                            }
                                          : currentOption,
                                    ),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                      <Input
                        value={option.label}
                        onChange={(event) =>
                          setQuestions((prev) =>
                            prev.map((item, itemIndex) =>
                              itemIndex === index
                                ? {
                                    ...item,
                                    options: (item.options ?? []).map(
                                      (currentOption, currentOptionIndex) =>
                                        currentOptionIndex === optionIndex
                                          ? {
                                              ...currentOption,
                                              label: event.target.value,
                                            }
                                          : currentOption,
                                    ),
                                  }
                                : item,
                            ),
                          )
                        }
                      />
                      {question.question_type !== "judge" ? (
                        <Button
                          onClick={() =>
                            setQuestions((prev) =>
                              prev.map((item, itemIndex) =>
                                itemIndex === index
                                  ? {
                                      ...item,
                                      options: (item.options ?? []).filter(
                                        (_, currentOptionIndex) =>
                                          currentOptionIndex !== optionIndex,
                                      ),
                                    }
                                  : item,
                              ),
                            )
                          }
                        >
                          删除选项
                        </Button>
                      ) : null}
                    </Space>
                  ))}
                  {question.question_type !== "judge" ? (
                    <Button
                      onClick={() =>
                        setQuestions((prev) =>
                          prev.map((item, itemIndex) =>
                            itemIndex === index
                              ? {
                                  ...item,
                                  options: [
                                    ...(item.options ?? []),
                                    {
                                      label: `选项 ${(item.options ?? []).length + 1}`,
                                      value: String.fromCharCode(
                                        65 + (item.options ?? []).length,
                                      ),
                                    },
                                  ],
                                }
                              : item,
                          ),
                        )
                      }
                    >
                      新增选项
                    </Button>
                  ) : null}
                  <Select
                    mode={
                      question.question_type === "multiple"
                        ? "multiple"
                        : undefined
                    }
                    value={question.correct_answer as any}
                    options={(question.options ?? []).map((item) => ({
                      label: `${item.value}. ${item.label}`,
                      value: item.value,
                    }))}
                    placeholder="选择正确答案"
                    onChange={(value) =>
                      setQuestions((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, correct_answer: value }
                            : item,
                        ),
                      )
                    }
                  />
                  <Input.TextArea
                    rows={2}
                    value={question.explanation}
                    placeholder="答案解析，可选"
                    onChange={(event) =>
                      setQuestions((prev) =>
                        prev.map((item, itemIndex) =>
                          itemIndex === index
                            ? { ...item, explanation: event.target.value }
                            : item,
                        ),
                      )
                    }
                  />
                </Space>
              </Card>
            ))}
          </div>
        </div>
      </BaseModal>
    </>
  );
}
